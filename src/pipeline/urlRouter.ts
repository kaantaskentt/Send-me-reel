import type { Platform } from "./types.js";

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/i;

const PLATFORM_PATTERNS: [Platform, RegExp][] = [
  ["instagram", /(?:instagram\.com|instagr\.am)\//i],
  ["tiktok", /(?:tiktok\.com|vm\.tiktok\.com)\//i],
  ["x", /(?:x\.com|twitter\.com)\//i],
];

// Domains that are clearly articles/blogs, not social media
const ARTICLE_EXTENSIONS = /\.(com|org|net|io|dev|co|ai|app|xyz|me|info|blog)/i;

export function extractUrl(text: string): string | null {
  const match = text.match(URL_REGEX);
  return match ? match[0] : null;
}

export function detectPlatform(url: string): Platform {
  for (const [platform, pattern] of PLATFORM_PATTERNS) {
    if (pattern.test(url)) return platform;
  }

  // If it's a URL but not a known social platform, treat as article
  if (URL_REGEX.test(url)) return "article";

  return "unknown";
}
