import { ApifyClient } from "apify-client";
import fs from "fs/promises";
import { existsSync, statSync } from "fs";
import path from "path";
import { ServiceError } from "../pipeline/types.js";
import type { Platform, ScrapedVideo } from "../pipeline/types.js";
import { ensureTmpDir } from "./storage.js";
import { config } from "../config.js";

const client = new ApifyClient({
  token: process.env.APIFY_TOKEN,
});

/** Map platform → Apify actor ID */
const ACTOR_MAP: Partial<Record<Platform, string>> = {
  // Use the general instagram-scraper which honors directUrls exactly.
  // The instagram-reel-scraper was returning the @instagram feed when combined with a username input.
  instagram: "apify/instagram-scraper",
  tiktok: "clockworks/tiktok-scraper",
  // The bulk tweet-scraper forbids single tweets; this actor explicitly supports them.
  x: "apidojo/twitter-scraper-lite",
};

function xPostId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    if (!/^(?:(?:www|mobile)\.)?(?:x|twitter)\.com$/.test(url.hostname)) return undefined;
    return url.pathname.match(/^\/(?:[^/]+|i\/web)\/status\/(\d+)(?:\/|$)/)?.[1];
  } catch { return undefined; }
}

/** Build actor-specific input from a single URL */
function buildInput(platform: Platform, url: string): Record<string, unknown> {
  switch (platform) {
    case "instagram":
      // ONLY directUrls — no username input that causes the actor to scrape a whole feed
      return { directUrls: [url], resultsType: "posts", resultsLimit: 1, addParentData: false };
    case "tiktok":
      return { postURLs: [url], resultsPerPage: 1 };
    case "x":
      if (!xPostId(url)) throw new ServiceError("NOT_A_VIDEO", "Supply one X status URL, not a profile or search", false);
      return { startUrls: [url], maxItems: 1 };
    default:
      throw new ServiceError("UNSUPPORTED_PLATFORM", `Apify fallback not available for ${platform}`, false);
  }
}

/**
 * Scrape video metadata via Apify actor.
 * Returns the same ScrapedVideo shape as the yt-dlp scraper.
 */
export async function scrapeWithApify(
  platform: Platform,
  url: string,
): Promise<ScrapedVideo & { apifyVideoUrl?: string }> {
  const actorId = ACTOR_MAP[platform];
  if (!actorId) {
    throw new ServiceError("UNSUPPORTED_PLATFORM", `No Apify actor for ${platform}`, false);
  }

  if (!process.env.APIFY_TOKEN) {
    throw new ServiceError("APIFY_NOT_CONFIGURED", "APIFY_TOKEN not set", false);
  }

  console.log(`[apify] Running actor ${actorId} for ${url}`);

  const input = buildInput(platform, url);
  const run = await client.actor(actorId).call(input, {
    timeout: 60,
    waitSecs: 60,
    ...(platform === "x" ? { maxItems: 1, maxTotalChargeUsd: 0.10 } : {}),
  });

  if (run.status !== "SUCCEEDED") {
    throw new ServiceError("APIFY_RUN_FAILED", `Apify actor did not finish successfully (${run.status})`, false);
  }
  const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 10 });

  if (!items || items.length === 0) {
    throw new ServiceError(
      "APIFY_NO_RESULTS",
      `Apify actor returned no results for ${url}`,
      false,
    );
  }

  // For Instagram: filter to the result matching our directUrl (not the dummy username's posts)
  const shortcode = url.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/)?.[2];
  let data: Record<string, any> | undefined;

  if (platform === "instagram" && shortcode) {
    // STRICT match — do not fall back to items[0] for Instagram, or we return a random stranger's post
    data = items.find((item: any) =>
      item.shortCode === shortcode ||
      item.shortcode === shortcode ||
      item.inputUrl?.includes(shortcode) ||
      item.url?.includes(shortcode),
    ) as Record<string, any> | undefined;

    if (!data) {
      console.error(`[apify] No item matched shortcode ${shortcode} — refusing to use wrong content. Items returned: ${items.length}`);
      throw new ServiceError(
        "APIFY_NO_MATCH",
        `Apify returned results but none matched the requested reel (${shortcode}). Refusing to analyze wrong content.`,
        false,
      );
    }
  } else if (platform === "x") {
    const requestedId = xPostId(url);
    data = items.find((item: any) => {
      const id = item.id_str ?? item.id ?? item.tweetId;
      return (id !== undefined ? String(id) : xPostId(item.url) || xPostId(item.twitterUrl)) === requestedId;
    }) as Record<string, any> | undefined;
    if (!data) throw new ServiceError("APIFY_NO_MATCH", "Apify did not return the requested X post; refusing unrelated content", false);
  } else {
    // TikTok receives one post URL.
    data = items[0] as Record<string, any>;
  }

  console.log(
    `[apify] actor=${actorId} items_returned=${items.length} requested_shortcode=${shortcode || "n/a"} ` +
    `matched=${!!data} keys=[${Object.keys(data).slice(0, 10).join(",")}]`,
  );
  console.log(`[apify] caption_preview: ${(data.caption || data.text || "").slice(0, 60)}`);

  return mapToScrapedVideo(platform, url, data);
}

/**
 * Map actor-specific output → ScrapedVideo interface.
 * Each platform returns different field names.
 */
function mapToScrapedVideo(
  platform: Platform,
  url: string,
  data: Record<string, any>,
): ScrapedVideo & { apifyVideoUrl?: string } {
  switch (platform) {
    case "instagram": {
      // Try all known field shapes across apify/instagram-scraper and instagram-reel-scraper
      const videoUrl =
        data.videoUrl ||
        data.video_url ||
        data.videoPlaybackUrl ||
        (Array.isArray(data.videoUrls) ? data.videoUrls[0]?.url || data.videoUrls[0] : undefined);

      const caption =
        data.caption ||
        data.description ||
        data.text ||
        data.edge_media_to_caption?.edges?.[0]?.node?.text ||
        "";

      const authorUsername =
        data.ownerUsername ||
        data.owner_username ||
        data.owner?.username ||
        data.author?.username ||
        data.ownerId ||
        "";

      const authorName =
        data.ownerFullName ||
        data.owner?.full_name ||
        data.author?.full_name ||
        authorUsername;

      const shortCode = data.shortCode || data.shortcode || "";

      return {
        videoUrl: url,
        caption,
        authorName,
        authorUsername,
        likes: data.likesCount || data.likes || data.like_count || 0,
        views: data.videoPlayCount || data.videoViewCount || data.viewCount || data.view_count || 0,
        hashtags: data.hashtags || [],
        metadata: {
          id: shortCode || data.id,
          duration: data.videoDuration || data.duration || data.video_duration,
          timestamp: data.timestamp || data.taken_at_timestamp,
          comment_count: data.commentsCount || data.comments || data.comment_count || 0,
          thumbnail: data.displayUrl || data.display_url || data.thumbnailUrl || data.thumbnail_src,
          webpage_url: url,
          source: "apify",
        },
        apifyVideoUrl: videoUrl,
      };
    }

    case "tiktok":
      return {
        videoUrl: url,
        caption: data.text || data.desc || data.description || "",
        authorName: data.authorMeta?.name || data.author?.nickname || data.authorName || "",
        authorUsername: data.authorMeta?.name || data.author?.uniqueId || data.authorId || "",
        likes: data.diggCount || data.likes || data.likesCount || 0,
        views: data.playCount || data.plays || data.viewCount || 0,
        hashtags: (data.hashtags || []).map((h: any) => (typeof h === "string" ? h : h.name || h.title || "")),
        metadata: {
          id: data.id,
          duration: data.videoMeta?.duration || data.duration,
          timestamp: data.createTime || data.createTimeISO,
          comment_count: data.commentCount || data.comments || 0,
          thumbnail: data.covers?.default || data.videoMeta?.coverUrl,
          webpage_url: data.webVideoUrl || url,
          source: "apify",
        },
        apifyVideoUrl: data.videoUrl || data.webVideoUrl || data.video_url,
      };

    case "x": {
      // A post can begin with a photo and have a video later in the media array.
      const allMedia = data.extendedEntities?.media || data.extended_entities?.media || data.media || [];
      const mediaItems = Array.isArray(allMedia) ? allMedia : [];
      const media = mediaItems.find((item: any) => item.video_info || item.videoInfo || item.type === "video");
      const videoInfo = media?.video_info || media?.videoInfo;
      const videoVariants = videoInfo?.variants || [];
      // Pick highest bitrate MP4
      const mp4s = videoVariants
        .filter((v: any) => (v.content_type || v.contentType) === "video/mp4" && typeof v.url === "string")
        .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
      const videoDownloadUrl = mp4s[0]?.url || data.videoUrl || data.downloadUrl;
      if (!videoDownloadUrl) {
        throw new ServiceError(media ? "APIFY_VIDEO_UNAVAILABLE" : "NOT_A_VIDEO", "This X post has no downloadable video; only its public text is available", false);
      }

      return {
        videoUrl: url,
        caption: data.full_text || data.text || data.tweetText || "",
        authorName: data.user?.name || data.author?.name || data.userName || "",
        authorUsername: data.user?.screen_name || data.author?.userName || data.userScreenName || "",
        likes: data.favorite_count || data.favouritesCount || data.likeCount || 0,
        views: data.views || data.viewCount || 0,
        hashtags: data.entities?.hashtags?.map((h: any) => h.text || h.tag) || [],
        metadata: {
          id: data.id_str || data.id || data.tweetId || xPostId(data.url) || xPostId(data.twitterUrl),
          duration: videoInfo?.duration_millis ? videoInfo.duration_millis / 1000 : undefined,
          timestamp: data.created_at || data.createdAt,
          comment_count: data.reply_count || data.replyCount || 0,
          thumbnail: media?.media_url_https || data.thumbnailUrl,
          webpage_url: url,
          source: "apify",
        },
        apifyVideoUrl: videoDownloadUrl,
      };
    }

    default:
      throw new ServiceError("UNSUPPORTED_PLATFORM", `Cannot map Apify data for ${platform}`, false);
  }
}

/**
 * Download video from a CDN URL via our Vercel proxy (Instagram CDN blocks direct access).
 * The proxy runs on AWS where Instagram doesn't block requests.
 * Saves to: /tmp/contextdrop/{analysisId}/video.mp4
 */
export async function downloadFromCdn(
  videoUrl: string,
  analysisId: string,
): Promise<string> {
  const dir = await ensureTmpDir(analysisId);
  const filePath = path.join(dir, "video.mp4");

  const appUrl = config.appUrl;
  const proxySecret = process.env.MEDIA_PROXY_SECRET || process.env.JWT_SECRET;
  if (!proxySecret) {
    throw new ServiceError("PROXY_NOT_CONFIGURED", "A media proxy secret is required", false);
  }

  console.log(`[apify] Downloading video via proxy: ${videoUrl.slice(0, 80)}...`);

  const response = await fetch(`${appUrl}/api/proxy-download`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-proxy-secret": proxySecret,
    },
    body: JSON.stringify({ url: videoUrl }),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "unknown");
    throw new ServiceError(
      "APIFY_DOWNLOAD_FAILED",
      `Proxy download failed (${response.status}): ${errorText.slice(0, 200)}`,
      false,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  if (!existsSync(filePath) || statSync(filePath).size < 1000) {
    throw new ServiceError(
      "APIFY_DOWNLOAD_FAILED",
      "Downloaded file is too small or missing",
      false,
    );
  }

  console.log(`[apify] Downloaded OK: ${statSync(filePath).size} bytes`);
  return filePath;
}
