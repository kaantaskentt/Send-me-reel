import OpenAI from "openai";
import { supabase } from "../../db/client.js";
import { config } from "../../config.js";
import {
  CANONICAL_WIKI_FOLDERS,
  type CanonicalWikiFolderKey,
  type DbUserWikiFolder,
  type DbUserWikiPage,
  type DbUserWikiSource,
  type WikiFolderType,
  type WikiLinkRelation,
  type WikiPageType,
} from "../../db/wiki.js";

const openai = new OpenAI({ apiKey: config.openaiApiKey });

const MAX_PAGE_BODY_CHARS = 8_000;
const MAX_PAGES_PER_COMPILE = 4;
const MAX_LOG_BODY_CHARS = 12_000;

export type WikiCompileStatus = "done" | "ignored";

export interface WikiCompileResult {
  status: WikiCompileStatus;
  reason: string | null;
  touchedPages: string[];
}

interface ExistingWikiContext {
  folders: DbUserWikiFolder[];
  pages: DbUserWikiPage[];
}

interface ProposedFolder {
  path: string;
  title: string;
  folder_type?: WikiFolderType | null;
  canonical_key?: string | null;
}

interface ProposedPage {
  path: string;
  title: string;
  page_type: WikiPageType;
  summary: string;
  body_md: string;
  folder_path?: string | null;
  confidence?: number | null;
  source_quote?: string | null;
}

interface ProposedLink {
  from: string;
  to: string;
  relation: WikiLinkRelation;
}

interface CompilerProposal {
  ignore_reason?: string | null;
  folders_to_create?: ProposedFolder[];
  pages_to_upsert?: ProposedPage[];
  links_to_add?: ProposedLink[];
  log_summary?: string | null;
}

const STARTER_FOLDER_KEYS: CanonicalWikiFolderKey[] = [
  "topics",
  "background",
  "goals",
  "working_style",
  "current_projects",
  "preferences",
  "open_questions",
  "sources",
  "just_watch",
];

const ALLOWED_FOLDER_TYPES = new Set<string>([
  "background",
  "goals",
  "working_style",
  "current_projects",
  "preferences",
  "topic",
  "tool",
  "concept",
  "source_cluster",
  "archive",
  "custom",
]);

const ALLOWED_PAGE_TYPES = new Set<string>([
  "index",
  "log",
  "timeline",
  "user_profile",
  "background",
  "goals",
  "working_style",
  "project",
  "preference",
  "concept",
  "tool",
  "product",
  "place",
  "recipe",
  "practice",
  "person",
  "question",
  "decision",
  "contradiction",
]);

const ALLOWED_RELATIONS = new Set<string>([
  "mentions",
  "uses",
  "similar_to",
  "contradicts",
  "supports",
  "preferred_over",
  "belongs_to_project",
  "answered_by",
  "next_step_for",
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function truncate(text: string | null | undefined, max: number): string {
  if (!text) return "";
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max - 1).trimEnd() + "…";
}

function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "untitled";
}

function normalizePath(input: string): string | null {
  const parts = input
    .split("/")
    .map((part) => slugify(part))
    .filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.some((part) => part === "." || part === "..")) return null;
  return parts.join("/");
}

function titleFromPath(path: string): string {
  const last = path.split("/").filter(Boolean).at(-1) ?? path;
  return last
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function canonicalForPath(path: string): CanonicalWikiFolderKey | null {
  for (const [key, folder] of Object.entries(CANONICAL_WIKI_FOLDERS)) {
    if (folder.path === path) return key as CanonicalWikiFolderKey;
  }
  return null;
}

function canonicalKeyFromValue(value: unknown): CanonicalWikiFolderKey | null {
  if (typeof value !== "string") return null;
  return value in CANONICAL_WIKI_FOLDERS ? (value as CanonicalWikiFolderKey) : null;
}

function safeFolderType(value: unknown): WikiFolderType | null {
  return typeof value === "string" && ALLOWED_FOLDER_TYPES.has(value)
    ? value as WikiFolderType
    : null;
}

function safePageType(value: unknown, fallback: WikiPageType): WikiPageType {
  return typeof value === "string" && ALLOWED_PAGE_TYPES.has(value)
    ? value as WikiPageType
    : fallback;
}

function safeRelation(value: unknown): WikiLinkRelation {
  return typeof value === "string" && ALLOWED_RELATIONS.has(value)
    ? value as WikiLinkRelation
    : "mentions";
}

function folderTypeForCanonical(key: CanonicalWikiFolderKey | null): WikiFolderType | null {
  if (!key) return null;
  if (key === "background") return "background";
  if (key === "goals") return "goals";
  if (key === "working_style") return "working_style";
  if (key === "current_projects") return "current_projects";
  if (key === "preferences") return "preferences";
  if (key === "sources" || key === "just_watch") return "source_cluster";
  return "topic";
}

function inferPageType(path: string, source?: DbUserWikiSource): WikiPageType {
  if (path.includes("preferences")) return "preference";
  if (path.includes("working-style")) return "working_style";
  if (path.includes("goals")) return "goals";
  if (path.includes("background")) return "user_profile";
  if (path.includes("recipes")) return "recipe";
  if (path.includes("places") || path.includes("restaurants") || path.includes("travel")) return "place";
  if (path.includes("buying-decisions")) return "product";
  if (source?.source_kind === "todo_created" || path.includes("projects")) return "project";
  return "concept";
}

function sourceText(source: DbUserWikiSource): string {
  const payload = isObject(source.payload) ? source.payload : {};
  return [
    source.title,
    source.source_summary,
    source.verdict_summary,
    asString(payload.verdict),
    asString(payload.caption),
    asString(payload.visual_summary),
    asString(payload.transcript_excerpt),
    asString(payload.content),
  ]
    .filter(Boolean)
    .join("\n");
}

function sourceTitle(source: DbUserWikiSource): string {
  const payload = isObject(source.payload) ? source.payload : {};
  const metadata = isObject(payload.metadata) ? payload.metadata : {};
  return (
    source.title ||
    asString(metadata.title) ||
    asString(payload.title) ||
    asString(payload.source_summary) ||
    asString(payload.content)?.slice(0, 80) ||
    `${source.source_kind.replace(/_/g, " ")} ${source.id.slice(0, 8)}`
  );
}

function isTrivialChat(source: DbUserWikiSource): boolean {
  if (
    source.source_kind !== "chat_user_message" &&
    source.source_kind !== "chat_assistant_answer"
  ) {
    return false;
  }

  const content = sourceText(source).trim().toLowerCase();
  return (
    content.length < 8 ||
    /^(ok|okay|thanks|thank you|thx|cool|nice|got it)$/i.test(content)
  );
}

function inferTopicFolder(source: DbUserWikiSource): {
  folderPath: string;
  title: string;
  canonicalKey: CanonicalWikiFolderKey | null;
} {
  if (source.is_just_watch) {
    return { folderPath: CANONICAL_WIKI_FOLDERS.just_watch.path, title: "Just a Watch", canonicalKey: "just_watch" };
  }

  const text = sourceText(source).toLowerCase();
  const candidates: Array<[CanonicalWikiFolderKey, RegExp]> = [
    ["claude_code", /\b(claude code|codex|cursor|agentic coding)\b/],
    ["llm_memory", /\b(llm wiki|memory|mem0|personal wiki|context engineering|rag)\b/],
    ["ai_agents", /\b(agent|agents|workflow automation|autonomous)\b/],
    ["prompting", /\b(prompt|prompting|system prompt|eval)\b/],
    ["automation", /\b(automation|zapier|n8n|make\.com|script)\b/],
    ["coding", /\b(code|software|typescript|postgres|supabase|api|github)\b/],
    ["research", /\b(research|paper|study|report|analysis)\b/],
    ["productivity", /\b(productivity|habit|workflow|focus|time management)\b/],
    ["career", /\b(career|job|hiring|interview|resume)\b/],
    ["business", /\b(business|startup|pricing|sales|revenue)\b/],
    ["marketing", /\b(marketing|growth|content strategy|seo)\b/],
    ["design", /\b(design|ux|ui|brand|visual)\b/],
    ["buying_decisions", /\b(buy|shop|purchase|deal|price|product)\b/],
    ["recipes", /\b(recipe|cook|ingredient|meal|dinner|breakfast)\b/],
    ["fitness", /\b(fitness|workout|exercise|training|gym|run)\b/],
    ["restaurants", /\b(restaurant|cafe|bar|menu)\b/],
    ["travel", /\b(travel|trip|hotel|flight|city)\b/],
  ];

  const match = candidates.find(([, regex]) => regex.test(text));
  if (match) {
    const key = match[0];
    const folder = CANONICAL_WIKI_FOLDERS[key];
    return { folderPath: folder.path, title: folder.title, canonicalKey: key };
  }

  return { folderPath: CANONICAL_WIKI_FOLDERS.topics.path, title: "Topics", canonicalKey: "topics" };
}

async function loadWikiContext(userId: string): Promise<ExistingWikiContext> {
  const [{ data: folders, error: folderErr }, { data: pages, error: pageErr }] = await Promise.all([
    supabase
      .from("user_wiki_folders")
      .select("*")
      .eq("user_id", userId)
      .order("path", { ascending: true })
      .limit(80),
    supabase
      .from("user_wiki_pages")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(30),
  ]);

  if (folderErr) throw new Error(`failed to load wiki folders: ${folderErr.message}`);
  if (pageErr) throw new Error(`failed to load wiki pages: ${pageErr.message}`);
  return {
    folders: (folders ?? []) as DbUserWikiFolder[],
    pages: (pages ?? []) as DbUserWikiPage[],
  };
}

async function findFolder(userId: string, path: string): Promise<DbUserWikiFolder | null> {
  const { data, error } = await supabase
    .from("user_wiki_folders")
    .select("*")
    .eq("user_id", userId)
    .eq("path", path)
    .maybeSingle<DbUserWikiFolder>();
  if (error) throw new Error(`failed to find folder ${path}: ${error.message}`);
  return data ?? null;
}

async function ensureFolder(userId: string, folder: ProposedFolder): Promise<DbUserWikiFolder> {
  const path = normalizePath(folder.path);
  if (!path) throw new Error(`invalid folder path: ${folder.path}`);

  const existing = await findFolder(userId, path);
  if (existing) return existing;

  const parentPath = path.includes("/") ? path.split("/").slice(0, -1).join("/") : null;
  const parent = parentPath
    ? await ensureFolder(userId, {
        path: parentPath,
        title: titleFromPath(parentPath),
        folder_type: folderTypeForCanonical(canonicalForPath(parentPath)) ?? "custom",
        canonical_key: canonicalForPath(parentPath),
      })
    : null;
  const canonicalKey = canonicalKeyFromValue(folder.canonical_key) ?? canonicalForPath(path);

  const { data, error } = await supabase
    .from("user_wiki_folders")
    .insert({
      user_id: userId,
      parent_id: parent?.id ?? null,
      parent_user_id: parent?.user_id ?? null,
      slug: path.split("/").at(-1) ?? path,
      path,
      title: folder.title || titleFromPath(path),
      description: null,
      folder_type: safeFolderType(folder.folder_type) ?? folderTypeForCanonical(canonicalKey) ?? "custom",
      canonical_key: canonicalKey,
      frontmatter: {},
      created_by: "compiler",
    })
    .select("*")
    .single<DbUserWikiFolder>();

  if (error || !data) {
    const afterRace = await findFolder(userId, path);
    if (afterRace) return afterRace;
    throw new Error(`failed to create folder ${path}: ${error?.message ?? "no row returned"}`);
  }
  return data;
}

async function ensureStarterFolders(userId: string): Promise<void> {
  for (const key of STARTER_FOLDER_KEYS) {
    const canonical = CANONICAL_WIKI_FOLDERS[key];
    await ensureFolder(userId, {
      path: canonical.path,
      title: canonical.title,
      folder_type: folderTypeForCanonical(key),
      canonical_key: key,
    });
  }
}

async function findPage(userId: string, path: string): Promise<DbUserWikiPage | null> {
  const { data, error } = await supabase
    .from("user_wiki_pages")
    .select("*")
    .eq("user_id", userId)
    .eq("path", path)
    .maybeSingle<DbUserWikiPage>();
  if (error) throw new Error(`failed to find wiki page ${path}: ${error.message}`);
  return data ?? null;
}

async function upsertPage(
  userId: string,
  page: ProposedPage,
  source: DbUserWikiSource | null,
): Promise<DbUserWikiPage> {
  const path = normalizePath(page.path);
  if (!path) throw new Error(`invalid page path: ${page.path}`);
  if (page.body_md.trim().length === 0) throw new Error(`page ${path} body is empty`);

  const folderPath = page.folder_path
    ? normalizePath(page.folder_path)
    : path.includes("/")
      ? path.split("/").slice(0, -1).join("/")
      : null;
  const folder = folderPath
    ? await ensureFolder(userId, {
        path: folderPath,
        title: titleFromPath(folderPath),
        folder_type: folderTypeForCanonical(canonicalForPath(folderPath)) ?? "custom",
        canonical_key: canonicalForPath(folderPath),
      })
    : null;
  const slug = path.split("/").at(-1) ?? path;
  const body = page.body_md.trim().slice(0, MAX_PAGE_BODY_CHARS);
  const confidence = typeof page.confidence === "number"
    ? Math.max(0, Math.min(1, page.confidence))
    : null;

  const existing = await findPage(userId, path);
  if (existing) {
    const { data, error } = await supabase
      .from("user_wiki_pages")
      .update({
        folder_id: folder?.id ?? null,
        folder_user_id: folder?.user_id ?? null,
        title: page.title || existing.title,
        page_type: page.page_type,
        summary: truncate(page.summary, 320),
        body_md: body,
        confidence,
        revision: existing.revision + 1,
        last_compiled_from_source_id: source?.id ?? existing.last_compiled_from_source_id,
        last_compiled_from_source_user_id: source?.user_id ?? existing.last_compiled_from_source_user_id,
      })
      .eq("id", existing.id)
      .eq("user_id", userId)
      .select("*")
      .single<DbUserWikiPage>();
    if (error || !data) throw new Error(`failed to update wiki page ${path}: ${error?.message ?? "no row returned"}`);
    return data;
  }

  const { data, error } = await supabase
    .from("user_wiki_pages")
    .insert({
      user_id: userId,
      folder_id: folder?.id ?? null,
      folder_user_id: folder?.user_id ?? null,
      slug,
      path,
      title: page.title || titleFromPath(path),
      page_type: page.page_type,
      summary: truncate(page.summary, 320),
      body_md: body,
      frontmatter: {},
      confidence,
      status: "active",
      last_compiled_from_source_id: source?.id ?? null,
      last_compiled_from_source_user_id: source?.user_id ?? null,
    })
    .select("*")
    .single<DbUserWikiPage>();

  if (error || !data) throw new Error(`failed to create wiki page ${path}: ${error?.message ?? "no row returned"}`);
  return data;
}

async function linkPageSource(
  userId: string,
  page: DbUserWikiPage,
  source: DbUserWikiSource,
  quote: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("user_wiki_page_sources")
    .insert({
      page_id: page.id,
      source_id: source.id,
      user_id: userId,
      quote: quote ? truncate(quote, 300) : null,
      source_span: null,
    });

  if (error && (error as { code?: string }).code !== "23505") {
    throw new Error(`failed to link source ${source.id} to page ${page.path}: ${error.message}`);
  }
}

async function addPageLink(
  userId: string,
  from: DbUserWikiPage,
  to: DbUserWikiPage,
  relation: WikiLinkRelation,
  source: DbUserWikiSource | null,
): Promise<void> {
  if (from.id === to.id) return;
  const { error } = await supabase
    .from("user_wiki_links")
    .insert({
      user_id: userId,
      from_page_id: from.id,
      to_page_id: to.id,
      relation,
      evidence_source_id: source?.id ?? null,
      evidence_source_user_id: source?.user_id ?? null,
    });

  if (error && (error as { code?: string }).code !== "23505") {
    throw new Error(`failed to add wiki link ${from.path} -> ${to.path}: ${error.message}`);
  }
}

function buildExistingWikiPrompt(context: ExistingWikiContext): string {
  const folders = context.folders
    .slice(0, 50)
    .map((folder) => `- ${folder.path} (${folder.folder_type ?? "custom"}${folder.canonical_key ? `, canonical=${folder.canonical_key}` : ""})`)
    .join("\n");
  const pages = context.pages
    .slice(0, 20)
    .map((page) => [
      `- ${page.path} [${page.page_type}]: ${truncate(page.summary ?? page.title, 180)}`,
      page.body_md ? `  body_excerpt: ${truncate(page.body_md, 700)}` : null,
    ].filter(Boolean).join("\n"))
    .join("\n");

  return [
    "Existing folders:",
    folders || "- none",
    "",
    "Existing pages:",
    pages || "- none",
  ].join("\n");
}

function buildSourcePrompt(source: DbUserWikiSource): string {
  const payload = JSON.stringify(source.payload, null, 2).slice(0, 7_000);
  return [
    `source_id: ${source.id}`,
    `source_kind: ${source.source_kind}`,
    `title: ${sourceTitle(source)}`,
    `source_url: ${source.source_url ?? ""}`,
    `is_just_watch: ${source.is_just_watch}`,
    `source_summary: ${source.source_summary ?? ""}`,
    `verdict_summary: ${source.verdict_summary ?? ""}`,
    `analysis_state: ${source.analysis_state ?? ""}`,
    "",
    "payload:",
    payload,
  ].join("\n");
}

const COMPILER_SYSTEM_PROMPT = `You compile a private per-user LLM wiki from already-finished app events.

Hard boundaries:
- Do not change scraping, source analysis, verdicts, or action lanes.
- Only create durable memory that helps future chat understand this user.
- Keep users isolated: all paths are for this one user's wiki only.
- Prefer existing folders/pages. Create folders only when useful.
- Prefer canonical folders when they fit: background, goals, working-style, current-projects, preferences, open-questions, topics/*, sources/just-a-watch, buying-decisions, recipes, fitness, places.
- If content is low-value just-watch, keep it under sources/just-a-watch unless it clearly belongs to an existing topic.
- Never merge unrelated domains into one page.
- Write concise markdown pages for an AI reader, not a public human wiki.

Return JSON only:
{
  "ignore_reason": null|string,
  "folders_to_create": [{"path":"topics/ai-agents","title":"AI Agents","folder_type":"topic","canonical_key":"ai_agents"}],
  "pages_to_upsert": [{
    "path":"topics/ai-agents/overview",
    "title":"AI Agents",
    "page_type":"concept",
    "summary":"one sentence",
    "body_md":"markdown page body",
    "folder_path":"topics/ai-agents",
    "confidence":0.7,
    "source_quote":"short phrase from source"
  }],
  "links_to_add": [{"from":"topics/ai-agents/overview","to":"preferences/user-preferences","relation":"mentions"}],
  "log_summary":"one compact log line"
}

Allowed page_type values: user_profile, background, goals, working_style, project, preference, concept, tool, product, place, recipe, practice, person, question, decision, contradiction.
Allowed folder_type values: background, goals, working_style, current_projects, preferences, topic, tool, concept, source_cluster, archive, custom.
Allowed relation values: mentions, uses, similar_to, contradicts, supports, preferred_over, belongs_to_project, answered_by, next_step_for.`;

async function proposeWithLlm(
  source: DbUserWikiSource,
  context: ExistingWikiContext,
): Promise<CompilerProposal | null> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4-nano",
      max_tokens: 1_700,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: COMPILER_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            buildExistingWikiPrompt(context),
            "",
            "New source snapshot:",
            buildSourcePrompt(source),
          ].join("\n"),
        },
      ],
    });

    const text = response.choices[0]?.message?.content;
    if (!text) return null;
    return JSON.parse(text) as CompilerProposal;
  } catch (err) {
    console.error("[wiki-compiler] LLM proposal failed; using fallback:", err instanceof Error ? err.message : err);
    return null;
  }
}

function fallbackProposal(source: DbUserWikiSource): CompilerProposal {
  if (source.source_kind === "profile_updated") {
    const payload = isObject(source.payload) ? source.payload : {};
    const profileText = truncate(JSON.stringify(payload), 1_800);
    return {
      folders_to_create: [
        { path: "background", title: "Background", folder_type: "background", canonical_key: "background" },
        { path: "goals", title: "Goals", folder_type: "goals", canonical_key: "goals" },
        { path: "working-style", title: "Working Style", folder_type: "working_style", canonical_key: "working_style" },
        { path: "preferences", title: "Preferences", folder_type: "preferences", canonical_key: "preferences" },
      ],
      pages_to_upsert: [
        {
          path: "background/user-profile",
          title: "User Profile",
          page_type: "user_profile",
          summary: "Latest profile/context snapshot captured from onboarding or context settings.",
          body_md: `# User Profile\n\nLatest captured profile/context data:\n\n\`\`\`json\n${profileText}\n\`\`\``,
          folder_path: "background",
          confidence: 0.55,
          source_quote: source.source_summary,
        },
        {
          path: "preferences/user-preferences",
          title: "User Preferences",
          page_type: "preference",
          summary: "Preferences inferred from explicit profile/context settings.",
          body_md: `# User Preferences\n\nCurrent explicit context/profile snapshot:\n\n\`\`\`json\n${profileText}\n\`\`\``,
          folder_path: "preferences",
          confidence: 0.5,
          source_quote: source.source_summary,
        },
      ],
      log_summary: "Updated user profile and preferences from explicit context settings.",
    };
  }

  if (source.source_kind === "chat_user_message" || source.source_kind === "chat_assistant_answer") {
    const text = truncate(sourceText(source), 1_600);
    return {
      folders_to_create: [
        { path: "open-questions", title: "Open Questions", folder_type: "custom", canonical_key: "open_questions" },
      ],
      pages_to_upsert: [
        {
          path: "open-questions/chat-memory",
          title: "Chat Memory",
          page_type: "question",
          summary: "Durable chat context that may affect future assistance.",
          body_md: `# Chat Memory\n\nRecent durable turn (${source.source_kind}):\n\n> ${text}`,
          folder_path: "open-questions",
          confidence: 0.45,
          source_quote: text.slice(0, 240),
        },
      ],
      log_summary: "Captured durable chat context.",
    };
  }

  if (
    source.source_kind === "analysis_state_changed" ||
    source.source_kind === "analysis_starred" ||
    source.source_kind === "todo_created"
  ) {
    const text = truncate(sourceText(source), 1_600);
    return {
      folders_to_create: [
        { path: "preferences", title: "Preferences", folder_type: "preferences", canonical_key: "preferences" },
      ],
      pages_to_upsert: [
        {
          path: "preferences/interaction-signals",
          title: "Interaction Signals",
          page_type: "preference",
          summary: "Signals from starring, state changes, and tasks that reveal what the user values.",
          body_md: `# Interaction Signals\n\nLatest signal: ${source.source_kind}\n\n${text}`,
          folder_path: "preferences",
          confidence: 0.45,
          source_quote: text.slice(0, 240),
        },
      ],
      log_summary: `Captured ${source.source_kind.replace(/_/g, " ")} signal.`,
    };
  }

  const topic = inferTopicFolder(source);
  const folderPath = topic.folderPath;
  const title = source.is_just_watch ? "Just a Watch" : topic.title;
  const text = truncate(sourceText(source), source.is_just_watch ? 900 : 2_200);
  const pageType = source.is_just_watch ? "concept" : inferPageType(folderPath, source);

  return {
    folders_to_create: [
      {
        path: folderPath,
        title,
        folder_type: source.is_just_watch ? "source_cluster" : folderTypeForCanonical(topic.canonicalKey) ?? "topic",
        canonical_key: topic.canonicalKey,
      },
    ],
    pages_to_upsert: [
      {
        path: `${folderPath}/overview`,
        title,
        page_type: pageType,
        summary: source.is_just_watch
          ? "Compact references for sources the verdict treated as just a watch."
          : `User has saved or discussed content related to ${title}.`,
        body_md: [
          `# ${title}`,
          "",
          source.is_just_watch
            ? "This page keeps compact references to low-action sources so future chat can still recall them if the user asks."
            : "This page accumulates source-backed notes for future personalized chat.",
          "",
          `## Latest Source`,
          "",
          `- Title: ${sourceTitle(source)}`,
          source.source_url ? `- URL: ${source.source_url}` : null,
          source.verdict_summary ? `- Verdict: ${source.verdict_summary}` : null,
          text ? `- Notes: ${text}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        folder_path: folderPath,
        confidence: source.is_just_watch ? 0.35 : 0.5,
        source_quote: text.slice(0, 240),
      },
    ],
    log_summary: source.is_just_watch
      ? "Stored compact just-watch source reference."
      : `Compiled source into ${folderPath}.`,
  };
}

function sanitizeProposal(proposal: CompilerProposal, source: DbUserWikiSource): CompilerProposal {
  const folders: ProposedFolder[] = [];
  for (const folder of (proposal.folders_to_create ?? []).slice(0, 8)) {
    const path = normalizePath(folder.path);
    if (!path) continue;
    const canonicalKey = canonicalKeyFromValue(folder.canonical_key) ?? canonicalForPath(path);
    folders.push({
      path,
      title: truncate(folder.title || titleFromPath(path), 120),
      folder_type: safeFolderType(folder.folder_type) ?? folderTypeForCanonical(canonicalKey) ?? "custom",
      canonical_key: canonicalKey,
    });
  }

  const pages: ProposedPage[] = [];
  for (const page of (proposal.pages_to_upsert ?? []).slice(0, MAX_PAGES_PER_COMPILE)) {
    const path = normalizePath(page.path);
    if (!path) continue;
    const folderPath = page.folder_path
      ? normalizePath(page.folder_path)
      : path.includes("/")
        ? path.split("/").slice(0, -1).join("/")
        : null;
    const body = page.body_md?.trim() || fallbackProposal(source).pages_to_upsert?.[0]?.body_md || "";
    if (!body.trim()) continue;
    pages.push({
      path,
      title: truncate(page.title || titleFromPath(path), 140),
      page_type: safePageType(page.page_type, inferPageType(path, source)),
      summary: truncate(page.summary || source.source_summary || sourceTitle(source), 320),
      body_md: body,
      folder_path: folderPath,
      confidence: page.confidence,
      source_quote: truncate(page.source_quote || source.source_summary || sourceText(source), 300),
    });
  }

  const links = (proposal.links_to_add ?? [])
    .slice(0, 12)
    .map((link) => {
      const from = normalizePath(link.from);
      const to = normalizePath(link.to);
      if (!from || !to || from === to) return null;
      return { from, to, relation: safeRelation(link.relation) } satisfies ProposedLink;
    })
    .filter((link): link is ProposedLink => Boolean(link));

  return {
    ignore_reason: truncate(proposal.ignore_reason ?? "", 240) || null,
    folders_to_create: folders,
    pages_to_upsert: pages,
    links_to_add: links,
    log_summary: truncate(proposal.log_summary ?? "", 400) || null,
  };
}

async function refreshIndex(userId: string): Promise<DbUserWikiPage> {
  const [{ data: folders, error: folderErr }, { data: pages, error: pageErr }] = await Promise.all([
    supabase
      .from("user_wiki_folders")
      .select("*")
      .eq("user_id", userId)
      .order("path", { ascending: true })
      .limit(200),
    supabase
      .from("user_wiki_pages")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .neq("path", "index")
      .order("updated_at", { ascending: false })
      .limit(200),
  ]);

  if (folderErr) throw new Error(`failed to load folders for index: ${folderErr.message}`);
  if (pageErr) throw new Error(`failed to load pages for index: ${pageErr.message}`);

  const folderLines = ((folders ?? []) as DbUserWikiFolder[]).map((folder) => {
    const canonical = folder.canonical_key ? ` canonical=${folder.canonical_key}` : "";
    return `- ${folder.path} (${folder.folder_type ?? "custom"}${canonical})`;
  });
  const activePages = ((pages ?? []) as DbUserWikiPage[]).filter((page) => page.path !== "log");
  const pageLines = activePages.map((page) => (
    `- ${page.path} [${page.page_type}]${page.summary ? ` - ${page.summary}` : ""}`
  ));
  const openQuestionLines = activePages
    .filter((page) => page.page_type === "question" || page.path.startsWith("open-questions/"))
    .slice(0, 12)
    .map((page) => `- ${page.path}: ${page.summary ?? page.title}`);
  const recentLines = activePages
    .slice(0, 12)
    .map((page) => `- ${page.path}: ${page.summary ?? page.title}`);

  const body = [
    "# Index",
    "",
    "Per-user wiki catalog for retrieval and compiler routing.",
    "",
    "## Folders",
    "",
    folderLines.join("\n") || "- none",
    "",
    "## Pages",
    "",
    pageLines.join("\n") || "- none",
    "",
    "## Recently Updated",
    "",
    recentLines.join("\n") || "- none",
    "",
    "## Open Questions",
    "",
    openQuestionLines.join("\n") || "- none",
  ].join("\n");

  return upsertPage(
    userId,
    {
      path: "index",
      title: "Index",
      page_type: "index",
      summary: "Per-user wiki page and folder catalog.",
      body_md: body,
      folder_path: null,
      confidence: 1,
    },
    null,
  );
}

async function appendLog(
  userId: string,
  source: DbUserWikiSource,
  summary: string,
  touchedPages: string[],
): Promise<DbUserWikiPage> {
  const existing = await findPage(userId, "log");
  const timestamp = new Date().toISOString();
  const entry = [
    `- ${timestamp} source=${source.id} kind=${source.source_kind}: ${truncate(summary, 260)}`,
    touchedPages.length > 0 ? `  pages: ${touchedPages.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const previous = existing?.body_md?.trim() || "# Log\n\nChronological compiler digest.";
  const body = `${previous}\n${entry}`.slice(-MAX_LOG_BODY_CHARS);

  return upsertPage(
    userId,
    {
      path: "log",
      title: "Log",
      page_type: "log",
      summary: "Chronological compiler digest.",
      body_md: body.startsWith("# Log") ? body : `# Log\n\n${body}`,
      folder_path: null,
      confidence: 1,
    },
    source,
  );
}

export async function compileWikiSource(source: DbUserWikiSource): Promise<WikiCompileResult> {
  if (!isObject(source.payload)) {
    throw new Error(`source ${source.id} payload must be a JSON object`);
  }
  if (!source.content_hash || source.content_hash.length < 16) {
    throw new Error(`source ${source.id} content_hash is missing or malformed`);
  }
  if (isTrivialChat(source)) {
    return { status: "ignored", reason: "trivial chat turn", touchedPages: [] };
  }

  await ensureStarterFolders(source.user_id);

  if (source.source_kind === "manual_correction") {
    return { status: "ignored", reason: "manual correction not implemented in compiler MVP", touchedPages: [] };
  }

  const context = await loadWikiContext(source.user_id);
  const llmProposal = await proposeWithLlm(source, context);
  const proposal = sanitizeProposal(llmProposal ?? fallbackProposal(source), source);

  if (proposal.ignore_reason) {
    return { status: "ignored", reason: proposal.ignore_reason, touchedPages: [] };
  }

  if (!proposal.pages_to_upsert || proposal.pages_to_upsert.length === 0) {
    const fallback = sanitizeProposal(fallbackProposal(source), source);
    proposal.folders_to_create = fallback.folders_to_create;
    proposal.pages_to_upsert = fallback.pages_to_upsert;
    proposal.links_to_add = fallback.links_to_add;
    proposal.log_summary = fallback.log_summary;
  }

  for (const folder of proposal.folders_to_create ?? []) {
    await ensureFolder(source.user_id, folder);
  }

  const touchedPages: DbUserWikiPage[] = [];
  for (const pageProposal of proposal.pages_to_upsert ?? []) {
    const page = await upsertPage(source.user_id, pageProposal, source);
    await linkPageSource(source.user_id, page, source, pageProposal.source_quote ?? null);
    touchedPages.push(page);
  }

  const pageByPath = new Map(touchedPages.map((page) => [page.path, page]));
  for (const link of proposal.links_to_add ?? []) {
    const from = pageByPath.get(link.from) ?? await findPage(source.user_id, link.from);
    const to = pageByPath.get(link.to) ?? await findPage(source.user_id, link.to);
    if (from && to) {
      await addPageLink(source.user_id, from, to, link.relation, source);
    }
  }

  await appendLog(
    source.user_id,
    source,
    proposal.log_summary || `Compiled ${source.source_kind.replace(/_/g, " ")}.`,
    touchedPages.map((page) => page.path),
  );
  await refreshIndex(source.user_id);

  return {
    status: "done",
    reason: "compiled wiki source",
    touchedPages: touchedPages.map((page) => page.path),
  };
}
