import { exec } from "child_process";
import { promisify } from "util";
import { ServiceError } from "../pipeline/types.js";
import type { Platform, ScrapedVideo, ScrapedArticle } from "../pipeline/types.js";
import { scrapeWithApify } from "./apifyScraper.js";

const execAsync = promisify(exec);

const MAX_RETRIES = 2;
const RETRY_DELAY = 3000;

/**
 * Scrape video metadata using yt-dlp with retry logic.
 * Returns null if the URL is not a video (e.g. image post).
 */
export async function scrapeVideo(
  platform: Platform,
  url: string,
): Promise<ScrapedVideo> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[scraper] Retry ${attempt}/${MAX_RETRIES}...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY));
      }

      console.log(`[scraper] yt-dlp metadata for ${platform}: ${url}`);

      // Use stderr to capture errors, don't suppress them
      const { stdout, stderr } = await execAsync(
        `yt-dlp --dump-json --no-download "${url}" 2>&1 || true`,
        { timeout: 45000, maxBuffer: 10 * 1024 * 1024 },
      );

      const output = stdout.trim();

      // Check for common non-video errors
      if (!output || output.length < 10) {
        // yt-dlp returned nothing — likely not a video
        const combined = (stdout + stderr).toLowerCase();
        if (
          combined.includes("no video") ||
          combined.includes("not a video") ||
          combined.includes("unable to extract") ||
          combined.includes("unsupported url")
        ) {
          throw new ServiceError(
            "NOT_A_VIDEO",
            "This link doesn't contain a video. Send a Reel, TikTok, or video post.",
            false,
          );
        }
        throw new Error("yt-dlp returned empty output");
      }

      // Try to find the JSON line (yt-dlp may print warnings before JSON)
      const jsonLine = output.split("\n").find((line) => line.startsWith("{"));
      if (!jsonLine) {
        // Check if this is a connection error (retryable)
        if (
          output.includes("Connection refused") ||
          output.includes("timed out") ||
          output.includes("Network is unreachable")
        ) {
          throw new Error(`Network error: ${output.slice(0, 200)}`);
        }

        // Check if it's a "not a video" situation
        if (
          output.includes("no video formats") ||
          output.includes("Unsupported URL") ||
          output.includes("Unable to extract")
        ) {
          throw new ServiceError(
            "NOT_A_VIDEO",
            "This link doesn't contain a video. Try sending a Reel or video post instead.",
            false,
          );
        }

        throw new Error("No JSON found in yt-dlp output");
      }

      const data = JSON.parse(jsonLine);

      // Check if there's actually video content
      if (!data.duration && !data.formats?.length) {
        throw new ServiceError(
          "NOT_A_VIDEO",
          "This is an image post, not a video. Send a Reel or video post.",
          false,
        );
      }

      return {
        videoUrl: url,
        caption: data.description || data.title || "",
        authorName: data.uploader || data.channel || "",
        authorUsername: data.uploader_id || data.channel_id || "",
        likes: data.like_count || 0,
        views: data.view_count || 0,
        hashtags: data.tags || [],
        metadata: {
          id: data.id,
          duration: data.duration,
          timestamp: data.timestamp,
          comment_count: data.comment_count,
          thumbnail: data.thumbnail,
          webpage_url: data.webpage_url,
        },
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry non-retryable errors
      if (err instanceof ServiceError && !err.retryable) {
        throw err;
      }

      console.error(`[scraper] Attempt ${attempt} failed:`, lastError.message);
    }
  }

  throw new ServiceError(
    "SCRAPE_FAILED",
    `Failed to scrape ${platform} after ${MAX_RETRIES + 1} attempts: ${lastError?.message || "unknown error"}`,
    false,
  );
}

/**
 * Try yt-dlp first, fall back to Apify if it fails.
 */
export async function scrapeVideoWithFallback(
  platform: Platform,
  url: string,
): Promise<ScrapedVideo> {
  try {
    return await scrapeVideo(platform, url);
  } catch (ytdlpErr) {
    // Don't fallback for non-video content — Apify won't help
    if (ytdlpErr instanceof ServiceError && ytdlpErr.code === "NOT_A_VIDEO") {
      throw ytdlpErr;
    }

    console.log(`[scraper] yt-dlp failed, trying Apify fallback: ${ytdlpErr instanceof Error ? ytdlpErr.message : ytdlpErr}`);

    try {
      const result = await scrapeWithApify(platform, url);
      console.log(`[scraper] Apify fallback succeeded`);
      return result;
    } catch (apifyErr) {
      console.error(`[scraper] Apify fallback also failed:`, apifyErr instanceof Error ? apifyErr.message : apifyErr);
      throw new ServiceError(
        "SCRAPE_FAILED",
        `Both yt-dlp and Apify failed for ${platform}. yt-dlp: ${ytdlpErr instanceof Error ? ytdlpErr.message : ytdlpErr}`,
        false,
      );
    }
  }
}

export async function scrapeArticle(url: string): Promise<ScrapedArticle> {
  try {
    const response = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: "text/plain" },
    });

    if (!response.ok) {
      throw new ServiceError(
        "ARTICLE_FETCH_FAILED",
        `Jina Reader returned ${response.status}`,
        true,
      );
    }

    const text = await response.text();
    const lines = text.split("\n");
    const title = lines[0]?.replace(/^#\s*/, "") || "Untitled";

    return {
      title,
      text,
      url,
      metadata: { source: "jina_reader" },
    };
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    throw new ServiceError(
      "ARTICLE_FETCH_FAILED",
      `Failed to fetch article: ${err instanceof Error ? err.message : String(err)}`,
      true,
    );
  }
}
