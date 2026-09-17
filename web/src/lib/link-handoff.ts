/** Landing-to-workspace handoffs are explicit user intent, not capture instructions from a URL. */
export const LOCAL_LINK_HANDOFF_KEY = "contextdrop:local-link-handoff";
type HandoffStorage = Pick<Storage, "getItem" | "setItem">;
export type LocalLinkHandoff = { id: string; url: string };
const handoffIdPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

/** Public presentation only. Private routes and capture APIs still use their full origin checks. */
export function isPersonalLanding(headers: Pick<Headers, "get">, env: { NODE_ENV?: string; CONTEXTDROP_LOCAL_STUDIO?: string }): boolean {
  return env.NODE_ENV === "development" && env.CONTEXTDROP_LOCAL_STUDIO === "1" && /^(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(headers.get("host") ?? "");
}

export function contentLink(input: unknown): string | null {
  if (typeof input !== "string" || input.length > 2048) return null;
  const value = input.trim();
  if (!/^https?:\/\//i.test(value) || /\s/.test(value)) return null;
  try {
    const url = new URL(value);
    const publicHostname = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])$/i.test(url.hostname);
    if (url.username || url.password || url.port || !publicHostname || /(^|\.)(localhost|local|internal)$/.test(url.hostname)) return null;
    // All capture readers use HTTPS. Never silently accept a file, script or internal URL.
    url.protocol = "https:";
    return url.href;
  } catch { return null; }
}

export function parseLocalLinkHandoff(url: unknown, id: unknown): LocalLinkHandoff | null {
  const link = contentLink(url);
  return link && typeof id === "string" && handoffIdPattern.test(id) ? { id, url: link } : null;
}

export function localLinkDestination(url: string, storage: HandoffStorage | null, id: string, now = Date.now()): string {
  const handoff = parseLocalLinkHandoff(url, id);
  if (!handoff) throw new Error("Paste a full public link, starting with https://.");
  const query = new URLSearchParams({ link: handoff.url });
  try {
    if (!storage) throw new Error("Storage unavailable");
    storage.setItem(LOCAL_LINK_HANDOFF_KEY, JSON.stringify({ ...handoff, createdAt: now, claimed: false }));
    query.set("handoff", handoff.id);
  } catch { /* Storage unavailable: preserve the link and let the user press Read. */ }
  return `/replicate/local?${query}`;
}

export function claimLocalLinkHandoff(handoff: LocalLinkHandoff, storage: HandoffStorage, now = Date.now()): boolean {
  try {
    const saved = JSON.parse(storage.getItem(LOCAL_LINK_HANDOFF_KEY) ?? "null");
    if (!saved || saved.id !== handoff.id || saved.url !== handoff.url || saved.claimed !== false || !Number.isFinite(saved.createdAt) || now < saved.createdAt || now - saved.createdAt > 10 * 60_000) return false;
    // Claim before the request, including through React effect replay or a reload after failure.
    storage.setItem(LOCAL_LINK_HANDOFF_KEY, JSON.stringify({ ...saved, claimed: true }));
    return true;
  } catch { return false; }
}

export function sameContentLink(first: unknown, second: unknown): boolean {
  const a = contentLink(first), b = contentLink(second);
  if (!a || !b) return false;
  const identity = (value: string) => {
    const url = new URL(value);
    url.hash = "";
    if (url.hostname === "github.com" || url.hostname === "www.github.com") {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length === 2) return `github:${parts[0].toLowerCase()}/${parts[1].replace(/\.git$/i, "").toLowerCase()}`;
    }
    let videoId: string | null = null;
    if (url.hostname === "youtu.be") videoId = url.pathname.split("/")[1];
    else if (/(^|\.)youtube\.com$/.test(url.hostname)) videoId = url.pathname === "/watch" ? url.searchParams.get("v") : /^\/(shorts|embed|live)\//.test(url.pathname) ? url.pathname.split("/")[2] : null;
    return videoId && /^[\w-]{11}$/.test(videoId) ? `youtube:${videoId}` : url.href;
  };
  return identity(a) === identity(b);
}

export function linkLoginDestination(url: string): string {
  const link = contentLink(url);
  if (!link) throw new Error("Paste a full public link, starting with https://.");
  return `/login?next=/share&url=${encodeURIComponent(link)}`;
}
