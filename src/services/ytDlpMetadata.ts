/**
 * Select at the downloader boundary, before Node buffers stdout. A full info dict
 * can contain many megabytes of captions and format fragments that we never use.
 * yt-dlp's documented dictionary projection and slicing retain only source facts:
 * https://github.com/yt-dlp/yt-dlp#output-template
 */
export const YTDLP_METADATA_TEMPLATE = '{"source":%(.{id,title,description,uploader,channel,uploader_id,channel_id,duration,like_count,view_count,tags,timestamp,comment_count,thumbnail,webpage_url})j,"formats":%(formats.:1.{format_id}|[])j,"chapters":%(chapters.:256.{title,start_time,end_time}|[])j}';
export const YTDLP_METADATA_MAX_BYTES = 1024 * 1024;

export function ytDlpMetadataArgs(url: string): string[] {
  return [
    "--print", YTDLP_METADATA_TEMPLATE, "--skip-download", "--no-playlist",
    "--js-runtimes", "node", "--socket-timeout", "15", "--retries", "1", "--", url,
  ];
}

export function parseYtDlpMetadata(output: string): Record<string, any> {
  if (Buffer.byteLength(output, "utf8") > YTDLP_METADATA_MAX_BYTES) {
    throw Object.assign(new Error("Video metadata exceeded the supported size"), { code: "METADATA_TOO_LARGE" });
  }
  const line = output.trim().split("\n").find((entry) => entry.startsWith("{"));
  if (!line) throw new Error("No JSON found in yt-dlp output");
  const value = JSON.parse(line);
  if (!value || typeof value !== "object" || !value.source || typeof value.source !== "object" || Array.isArray(value.source)) {
    throw new Error("yt-dlp returned invalid source metadata");
  }
  return {
    ...value.source,
    formats: Array.isArray(value.formats) ? value.formats : [],
    chapters: Array.isArray(value.chapters) ? value.chapters : [],
  };
}
