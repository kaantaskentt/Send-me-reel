-- 016_subject_research.sql
-- Adds the subject_research column for the agentic understanding layer.
-- Stores the live web context we fetched about the subject of an analysis
-- (the tool/product/person/concept the post is about), so the verdict + chat
-- + deep dive surfaces all share one grounding source.
--
-- Shape (TypeScript):
--   {
--     subject: string;
--     type: "tool" | "model" | "person" | "company" | "concept" | "repo";
--     summary: string;
--     canonicalUrl: string | null;
--     sourceUrls: string[];
--     snippets: string[];
--     fetchedAt: string;  // ISO timestamp
--   } | null
--
-- Additive, reversible. Existing rows get NULL.

ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS subject_research JSONB;
