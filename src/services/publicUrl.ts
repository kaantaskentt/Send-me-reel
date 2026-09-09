import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

/** Deny private, loopback, reserved and transition addresses before network access. */
export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 192 && b === 0 && (c === 0 || c === 2)) ||
      (a === 192 && b === 88 && c === 99) || (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113));
  }
  if (isIP(address) !== 6) return false;
  const [first, second = "0"] = address.toLowerCase().split(":");
  const prefix = parseInt(first, 16);
  const subnet = parseInt(second || "0", 16);
  return prefix >= 0x2000 && prefix <= 0x3fff && prefix !== 0x2002 &&
    prefix !== 0x3fff && !(prefix === 0x2001 && (subnet <= 0x1ff || subnet === 0xdb8));
}

/** Validation only: callers must pin these addresses or use an egress boundary. */
export async function resolvePublicUrl(value: string, lookup: typeof dnsLookup = dnsLookup) {
  if (value.length > 8192) throw new Error("URL is too long");
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port) {
    throw new Error("A public HTTP(S) URL without credentials or custom port is required");
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await Promise.race([
    lookup(hostname, { all: true, verbatim: true }),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("DNS lookup timed out")), 5000);
    }),
  ]).finally(() => clearTimeout(timer));
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error("URL resolved to a non-public address");
  }
  return { url, addresses };
}
