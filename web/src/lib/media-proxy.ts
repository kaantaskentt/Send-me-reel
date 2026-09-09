import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { timingSafeEqual } from "node:crypto";
import { resolvePublicUrl } from "../../../src/services/publicUrl";
export { isPublicAddress } from "../../../src/services/publicUrl";

export const MAX_MEDIA_BYTES = 100 * 1024 * 1024;
const CDN_HOSTS = [
  "cdninstagram.com", "fbcdn.net", "tiktokcdn.com", "tiktokcdn-us.com",
  "tiktokcdn-eu.com", "tiktokv.com", "byteoversea.com", "ibytedtos.com",
  "video.twimg.com", "pbs.twimg.com", "googlevideo.com",
];

export function validProxySecret(supplied: string | null, expected: string | undefined): boolean {
  if (!supplied?.trim() || !expected?.trim()) return false;
  const actual = Buffer.from(supplied);
  const wanted = Buffer.from(expected);
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

export function parseMediaUrl(value: string): URL {
  if (value.length > 8192) throw new Error("Media URL is too long");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new Error("Media downloads require HTTPS without credentials or a custom port");
  }
  if (!CDN_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
    throw new Error("Unsupported media CDN");
  }
  return url;
}

type MediaDependencies = {
  lookup?: typeof dnsLookup;
  request?: typeof httpsRequest;
  maxBytes?: number;
  timeoutMs?: number;
};

/** Resolve once, pin the checked address to the TLS request, and never follow redirects. */
export async function downloadPublicMedia(value: string, dependencies: MediaDependencies = {}): Promise<Buffer> {
  const url = parseMediaUrl(value);
  const request = dependencies.request || httpsRequest;
  const maxBytes = dependencies.maxBytes ?? MAX_MEDIA_BYTES;
  const timeoutMs = dependencies.timeoutMs ?? 90_000;
  const { addresses } = await resolvePublicUrl(url.href, dependencies.lookup);
  const target = addresses[0];

  return new Promise<Buffer>((resolveDownload, rejectDownload) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const req = request(url, {
      agent: false,
      family: target.family,
      // Preserve the hostname for TLS verification while connecting to its checked IP.
      lookup: (_hostname, _options, callback) => callback(null, target.address, target.family),
      headers: { "User-Agent": "Mozilla/5.0", Referer: "https://www.instagram.com/" },
    }, (response) => {
      const fail = (message: string) => {
        clearTimeout(timer);
        const error = new Error(message);
        rejectDownload(error);
        req.destroy(error);
      };
      if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
        fail("Media CDN returned a non-success status or redirect");
        return;
      }
      const type = (response.headers["content-type"] || "").toLowerCase().split(";")[0];
      if (!type.startsWith("video/") && type !== "application/octet-stream") {
        fail("Media CDN did not return a video");
        return;
      }
      const declared = Number(response.headers["content-length"]);
      if (Number.isFinite(declared) && declared > maxBytes) {
        fail("Media exceeds the download size limit");
        return;
      }
      response.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > maxBytes) {
          fail("Media exceeds the download size limit");
          return;
        }
        chunks.push(Buffer.from(chunk));
      });
      response.on("error", (error) => fail(error.message));
      response.on("aborted", () => fail("Media download was interrupted"));
      response.on("end", () => {
        clearTimeout(timer);
        if (!response.complete) return rejectDownload(new Error("Media download was incomplete"));
        resolveDownload(Buffer.concat(chunks));
      });
    });
    req.on("error", (error) => {
      clearTimeout(timer);
      rejectDownload(error);
    });
    timer = setTimeout(() => req.destroy(new Error("Media download timed out")), timeoutMs);
    req.end();
  });
}
