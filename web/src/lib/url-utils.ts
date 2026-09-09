export type Platform =
  | "instagram"
  | "tiktok"
  | "x"
  | "linkedin"
  | "youtube"
  | "article"
  | "unknown";

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/i;

const PLATFORM_HOSTS: [Platform, string[]][] = [
  ["instagram", ["instagram.com", "instagr.am"]],
  ["tiktok", ["tiktok.com"]],
  ["x", ["x.com", "twitter.com"]],
  ["linkedin", ["linkedin.com", "lnkd.in"]],
  ["youtube", ["youtube.com", "youtu.be"]],
];

/** Keep identical to the worker parser; tests run the same input corpus through both. */
export function parseSourceUrl(value: string): URL | null {
  if (value.length > 8192 || /[\u0000-\u0020\\]/.test(value)) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port) return null;
    if (!host.includes(".") || host.startsWith("[") || /^[\d.]+$/.test(host)) return null;
    if (/(?:^|\.)(?:localhost|local|internal|test)$/.test(host)) return null;
    url.hostname = host;
    return url;
  } catch {
    return null;
  }
}

/** Extract the first URL from a string (e.g. shared text containing "Check this out https://..."). */
export function extractUrl(text: string): string | null {
  const match = text.match(URL_REGEX);
  return match ? match[0] : null;
}

export function detectPlatform(url: string): Platform {
  const parsed = parseSourceUrl(url);
  if (!parsed) return "unknown";
  for (const [platform, hosts] of PLATFORM_HOSTS) {
    if (hosts.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))) return platform;
  }
  return "article";
}
