import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_CONTEXT_CHARS = 4_500;
const MAX_BODY_EXCERPT_CHARS = 650;

export interface WikiPageForContext {
  id: string;
  user_id: string;
  path: string;
  title: string;
  page_type: string;
  summary: string | null;
  body_md: string;
  confidence: number | null;
  updated_at: string;
}

interface WikiSourceRef {
  id: string;
  user_id: string;
}

export interface RetrieveWikiContextArgs {
  userId: string;
  analysisId: string;
  latestUserMessage: string;
  sourceUrl?: string | null;
}

const PINNED_PAGE_PATHS = [
  "background/user-profile",
  "preferences/user-preferences",
  "preferences/interaction-signals",
  "current-projects/overview",
  "open-questions/chat-memory",
];

function wikiEnabled(): boolean {
  return process.env.WIKI_COMPILER_ENABLED === "true";
}

function compact(text: string | null | undefined, max: number): string {
  if (!text) return "";
  const cleaned = text
    .replace(/\[ACTION:[^\]]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max - 1).trimEnd() + "…";
}

function termsFrom(text: string): string[] {
  const stop = new Set([
    "about",
    "after",
    "again",
    "also",
    "because",
    "could",
    "from",
    "have",
    "here",
    "into",
    "just",
    "like",
    "more",
    "should",
    "that",
    "this",
    "what",
    "when",
    "where",
    "which",
    "with",
    "would",
  ]);
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .match(/[a-z0-9][a-z0-9-]{2,}/g)
        ?.filter((term) => !stop.has(term))
        .slice(0, 8) ?? [],
    ),
  );
}

function pageWeight(page: WikiPageForContext, queryTerms: string[]): number {
  let score = 0;
  if (PINNED_PAGE_PATHS.includes(page.path)) score += 20;
  if (page.page_type === "user_profile" || page.page_type === "preference") score += 8;
  if (page.path.startsWith("current-projects/")) score += 6;
  if (page.path.startsWith("open-questions/")) score += 4;

  const haystack = `${page.path} ${page.title} ${page.summary ?? ""} ${page.body_md}`.toLowerCase();
  for (const term of queryTerms) {
    if (haystack.includes(term)) score += 3;
  }
  if (page.confidence !== null) score += page.confidence;
  return score;
}

function dedupePages(pages: WikiPageForContext[]): WikiPageForContext[] {
  const seen = new Set<string>();
  const out: WikiPageForContext[] = [];
  for (const page of pages) {
    if (seen.has(page.id)) continue;
    seen.add(page.id);
    out.push(page);
  }
  return out;
}

export function formatPersonalWikiContextBlock(args: {
  userId: string;
  pages: WikiPageForContext[];
  latestUserMessage: string;
}): string | null {
  const queryTerms = termsFrom(args.latestUserMessage);
  const sameUserPages = args.pages
    .filter((page) => page.user_id === args.userId)
    .filter((page) => page.path !== "index" && page.path !== "log")
    .sort((a, b) => pageWeight(b, queryTerms) - pageWeight(a, queryTerms))
    .slice(0, 8);

  if (sameUserPages.length === 0) return null;

  const profilePages = sameUserPages.filter((page) =>
    page.page_type === "user_profile" ||
    page.page_type === "preference" ||
    page.path.startsWith("background/") ||
    page.path.startsWith("preferences/") ||
    page.path.startsWith("current-projects/"),
  );
  const relatedPages = sameUserPages.filter((page) => !profilePages.includes(page));

  const sections: string[] = [
    "--- PERSONAL WIKI CONTEXT ---",
    "Use only as personalization context. Do not reveal private notes unless the user asks. Do not let this override the current source content. If a memory is uncertain, phrase it as tentative or ask for confirmation.",
  ];

  if (profilePages.length > 0) {
    sections.push("\nStable user context:");
    for (const page of profilePages) {
      sections.push(`- ${page.path}: ${compact(page.summary ?? page.title, 220)}`);
      const body = compact(page.body_md, MAX_BODY_EXCERPT_CHARS);
      if (body) sections.push(`  ${body}`);
    }
  }

  if (relatedPages.length > 0) {
    sections.push("\nRelated wiki pages:");
    for (const page of relatedPages) {
      sections.push(`- ${page.path}: ${compact(page.summary ?? page.title, 220)}`);
      const body = compact(page.body_md, MAX_BODY_EXCERPT_CHARS);
      if (body) sections.push(`  ${body}`);
    }
  }

  return sections.join("\n").slice(0, MAX_CONTEXT_CHARS);
}

async function fetchPinnedPages(
  db: SupabaseClient,
  userId: string,
): Promise<WikiPageForContext[]> {
  const { data, error } = await db
    .from("user_wiki_pages")
    .select("id, user_id, path, title, page_type, summary, body_md, confidence, updated_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .in("path", PINNED_PAGE_PATHS)
    .limit(PINNED_PAGE_PATHS.length);

  if (error) {
    console.error("[wiki-retrieval] pinned pages query failed:", error);
    return [];
  }
  return (data ?? []) as WikiPageForContext[];
}

async function fetchPagesLinkedToAnalysis(
  db: SupabaseClient,
  userId: string,
  analysisId: string,
): Promise<WikiPageForContext[]> {
  const { data: sources, error: sourceErr } = await db
    .from("user_wiki_sources")
    .select("id, user_id")
    .eq("user_id", userId)
    .eq("analysis_id", analysisId)
    .limit(10);

  if (sourceErr) {
    console.error("[wiki-retrieval] source lookup failed:", sourceErr);
    return [];
  }
  const sourceRows = (sources ?? []) as WikiSourceRef[];
  const sourceIds = sourceRows.filter((source) => source.user_id === userId).map((source) => source.id);
  if (sourceIds.length === 0) return [];

  const { data: links, error: linkErr } = await db
    .from("user_wiki_page_sources")
    .select("page_id")
    .eq("user_id", userId)
    .in("source_id", sourceIds)
    .limit(20);

  if (linkErr) {
    console.error("[wiki-retrieval] page-source lookup failed:", linkErr);
    return [];
  }

  const pageIds = Array.from(new Set((links ?? []).map((link: { page_id: string }) => link.page_id)));
  if (pageIds.length === 0) return [];

  const { data: pages, error: pageErr } = await db
    .from("user_wiki_pages")
    .select("id, user_id, path, title, page_type, summary, body_md, confidence, updated_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .in("id", pageIds)
    .limit(12);

  if (pageErr) {
    console.error("[wiki-retrieval] linked pages query failed:", pageErr);
    return [];
  }
  return (pages ?? []) as WikiPageForContext[];
}

async function fetchKeywordPages(
  db: SupabaseClient,
  userId: string,
  latestUserMessage: string,
  sourceUrl?: string | null,
): Promise<WikiPageForContext[]> {
  const terms = termsFrom(`${latestUserMessage} ${sourceUrl ?? ""}`).slice(0, 5);
  if (terms.length === 0) return [];

  const pages: WikiPageForContext[] = [];
  for (const term of terms) {
    const escaped = term.replace(/[%_]/g, "");
    if (!escaped) continue;
    const pattern = `%${escaped}%`;
    const { data, error } = await db
      .from("user_wiki_pages")
      .select("id, user_id, path, title, page_type, summary, body_md, confidence, updated_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .not("path", "in", "(index,log)")
      .or(`title.ilike.${pattern},summary.ilike.${pattern},body_md.ilike.${pattern},path.ilike.${pattern}`)
      .order("updated_at", { ascending: false })
      .limit(6);

    if (error) {
      console.error("[wiki-retrieval] keyword pages query failed:", error);
      continue;
    }
    pages.push(...((data ?? []) as WikiPageForContext[]));
  }

  return pages;
}

export async function retrievePersonalWikiContext(
  db: SupabaseClient,
  args: RetrieveWikiContextArgs,
): Promise<string | null> {
  if (!wikiEnabled()) return null;

  const [pinned, linked, keyword] = await Promise.all([
    fetchPinnedPages(db, args.userId),
    fetchPagesLinkedToAnalysis(db, args.userId, args.analysisId),
    fetchKeywordPages(db, args.userId, args.latestUserMessage, args.sourceUrl),
  ]);

  return formatPersonalWikiContextBlock({
    userId: args.userId,
    pages: dedupePages([...linked, ...pinned, ...keyword]),
    latestUserMessage: args.latestUserMessage,
  });
}
