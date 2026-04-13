export type Platform =
  | "instagram"
  | "tiktok"
  | "x"
  | "linkedin"
  | "youtube"
  | "article"
  | "unknown";

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/i;

const PLATFORM_PATTERNS: [Platform, RegExp][] = [
  ["instagram", /(?:instagram\.com|instagr\.am)\//i],
  ["tiktok", /(?:tiktok\.com|vm\.tiktok\.com)\//i],
  ["x", /(?:x\.com|twitter\.com)\//i],
  ["linkedin", /(?:linkedin\.com|lnkd\.in)\//i],
  ["youtube", /(?:youtube\.com|youtu\.be)\//i],
];

/** Extract the first URL from a string (e.g. shared text containing "Check this out https://..."). */
export function extractUrl(text: string): string | null {
  const match = text.match(URL_REGEX);
  return match ? match[0] : null;
}

export function detectPlatform(url: string): Platform {
  for (const [platform, pattern] of PLATFORM_PATTERNS) {
    if (pattern.test(url)) return platform;
  }
  if (URL_REGEX.test(url)) return "article";
  return "unknown";
}
