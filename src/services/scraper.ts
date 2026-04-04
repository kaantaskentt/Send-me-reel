import { exec } from "child_process";
import { promisify } from "util";
import { ServiceError } from "../pipeline/types.js";
import type { Platform, ScrapedVideo, ScrapedArticle } from "../pipeline/types.js";

const execAsync = promisify(exec);

/**
 * Scrape video metadata using yt-dlp.
 * Works for Instagram, TikTok, and X/Twitter — no Apify needed.
 */
export async function scrapeVideo(
  platform: Platform,
  url: string,
): Promise<ScrapedVideo> {
  try {
    console.log(`[scraper] yt-dlp metadata for ${platform}: ${url}`);
    const { stdout } = await execAsync(
      `yt-dlp --dump-json --no-download "${url}" 2>/dev/null`,
      { timeout: 45000 },
    );

    const data = JSON.parse(stdout.trim());

    return {
      videoUrl: url, // yt-dlp will download from original URL later
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
    throw new ServiceError(
      "SCRAPE_FAILED",
      `Failed to scrape ${platform}: ${err instanceof Error ? err.message : String(err)}`,
      true,
    );
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
