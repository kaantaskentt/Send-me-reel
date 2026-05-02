// Per-user LLM Wiki types — mirror migration 020_user_wiki.sql.
// CRUD helpers land in later PRs. Types live here so the source builder,
// worker, and chat retrieval can share one definition.

export type WikiSourceKind =
  | "analysis_completed"
  | "chat_user_message"
  | "chat_assistant_answer"
  | "analysis_state_changed"
  | "analysis_starred"
  | "todo_created"
  | "profile_updated"
  | "manual_correction";

export type WikiSourceStatus =
  | "pending"
  | "compiling"
  | "done"
  | "ignored"
  | "failed";

export type WikiFolderType =
  | "background"
  | "goals"
  | "working_style"
  | "current_projects"
  | "preferences"
  | "topic"
  | "tool"
  | "concept"
  | "source_cluster"
  | "archive"
  | "custom";

export type WikiPageType =
  | "index"
  | "log"
  | "timeline"
  | "user_profile"
  | "background"
  | "goals"
  | "working_style"
  | "project"
  | "preference"
  | "concept"
  | "tool"
  | "product"
  | "place"
  | "recipe"
  | "practice"
  | "person"
  | "question"
  | "decision"
  | "contradiction";

export type WikiPageStatus = "active" | "archived" | "forgotten";

export type WikiLinkRelation =
  | "mentions"
  | "uses"
  | "similar_to"
  | "contradicts"
  | "supports"
  | "preferred_over"
  | "belongs_to_project"
  | "answered_by"
  | "next_step_for";

export type WikiJobType =
  | "compile_source"
  | "compile_chat_turn"
  | "refresh_index"
  | "lint_user_wiki"
  | "backfill_user";

export type WikiJobStatus =
  | "pending"
  | "running"
  | "done"
  | "failed"
  | "ignored";

export interface DbUserWikiSource {
  id: string;
  user_id: string;
  source_kind: WikiSourceKind;
  analysis_id: string | null;
  chat_thread_id: string | null;
  chat_message_id: string | null;
  event_table: string | null;
  event_id: string | null;
  source_url: string | null;
  title: string | null;
  content_hash: string;
  source_summary: string | null;
  verdict_summary: string | null;
  is_just_watch: boolean;
  analysis_state: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  ingested_at: string | null;
  status: WikiSourceStatus;
  error_message: string | null;
}

export interface DbUserWikiFolder {
  id: string;
  user_id: string;
  parent_id: string | null;
  parent_user_id: string | null;
  slug: string;
  path: string;
  title: string;
  description: string | null;
  folder_type: WikiFolderType | null;
  canonical_key: string | null;
  sort_order: number;
  frontmatter: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DbUserWikiPage {
  id: string;
  user_id: string;
  folder_id: string | null;
  folder_user_id: string | null;
  slug: string;
  path: string;
  title: string;
  page_type: WikiPageType;
  summary: string | null;
  body_md: string;
  frontmatter: Record<string, unknown>;
  confidence: number | null;
  status: WikiPageStatus;
  revision: number;
  last_compiled_from_source_id: string | null;
  last_compiled_from_source_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbUserWikiPageSource {
  page_id: string;
  source_id: string;
  user_id: string;
  quote: string | null;
  source_span: Record<string, unknown> | null;
  created_at: string;
}

export interface DbUserWikiLink {
  id: string;
  user_id: string;
  from_page_id: string;
  to_page_id: string;
  relation: WikiLinkRelation;
  evidence_source_id: string | null;
  evidence_source_user_id: string | null;
  created_at: string;
}

export interface DbUserWikiJob {
  id: string;
  user_id: string;
  source_id: string | null;
  source_user_id: string | null;
  job_type: WikiJobType;
  status: WikiJobStatus;
  attempt_count: number;
  locked_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// Canonical folder vocabulary (plan section 7). The compiler prefers these
// titles/paths for common categories; users still get custom folders when
// nothing fits. canonical_key on a folder row maps an arbitrary user path
// back to one of these for cross-user analytics.
export const CANONICAL_WIKI_FOLDERS = {
  topics: { path: "topics", title: "Topics" },
  background: { path: "background", title: "Background" },
  goals: { path: "goals", title: "Goals" },
  working_style: { path: "working-style", title: "Working Style" },
  current_projects: { path: "current-projects", title: "Current Projects" },
  preferences: { path: "preferences", title: "Preferences" },
  open_questions: { path: "open-questions", title: "Open Questions" },
  sources: { path: "sources", title: "Sources" },
  just_watch: { path: "sources/just-a-watch", title: "Just a Watch" },
  ai_agents: { path: "topics/ai-agents", title: "AI Agents" },
  llm_memory: { path: "topics/llm-memory", title: "LLM Memory" },
  prompting: { path: "topics/prompting", title: "Prompting" },
  claude_code: { path: "topics/claude-code", title: "Claude Code" },
  automation: { path: "topics/automation", title: "Automation" },
  coding: { path: "topics/coding", title: "Coding" },
  research: { path: "topics/research", title: "Research" },
  productivity: { path: "topics/productivity", title: "Productivity" },
  career: { path: "topics/career", title: "Career" },
  business: { path: "topics/business", title: "Business" },
  marketing: { path: "topics/marketing", title: "Marketing" },
  design: { path: "topics/design", title: "Design" },
  buying_decisions: { path: "buying-decisions", title: "Buying Decisions" },
  recipes: { path: "recipes", title: "Recipes" },
  fitness: { path: "fitness", title: "Fitness" },
  places: { path: "places", title: "Places" },
  restaurants: { path: "places/restaurants", title: "Restaurants" },
  travel: { path: "places/travel", title: "Travel" },
} as const;

export type CanonicalWikiFolderKey = keyof typeof CANONICAL_WIKI_FOLDERS;
