-- Phase 2: user-action axis (saved / tried / set_aside).
--
-- Replaces the old verdict_intent (learn/apply) content-classification taxonomy
-- with a user-action axis. Strategy.md §6 + transformation-plan §6.
--
-- The verdict_intent column stays for one release for back-compat; the UI
-- stops reading from this PR forward (Phase 3 will fully retire it).
--
-- Both new columns are nullable — every existing analysis defaults to "saved"
-- (i.e. both tried_at and set_aside_at NULL). No data migration needed.

ALTER TABLE analyses ADD COLUMN IF NOT EXISTS tried_at timestamptz;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS set_aside_at timestamptz;

-- Indexes that match the new dashboard queries:
--   "saved but not yet decided" pile (most common read)
--   nightly auto-archive sweep (sets set_aside_at on stale rows)

CREATE INDEX IF NOT EXISTS idx_analyses_saved_unresolved
  ON analyses (user_id, created_at DESC)
  WHERE status = 'done' AND tried_at IS NULL AND set_aside_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_analyses_auto_archive_candidates
  ON analyses (created_at)
  WHERE status = 'done' AND tried_at IS NULL AND set_aside_at IS NULL;
