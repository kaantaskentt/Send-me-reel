-- Queue worker hardening: track retry attempts + last update time.
-- Prevents web-submitted analyses from hanging forever if a transient failure
-- occurs, and lets the startup recovery sweep detect truly-stuck rows
-- (status hasn't changed in 10+ min).

ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0;

ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Auto-bump updated_at on every row update. The `update_updated_at()`
-- function is already defined in 001_initial.sql.
DROP TRIGGER IF EXISTS analyses_updated_at ON analyses;
CREATE TRIGGER analyses_updated_at
  BEFORE UPDATE ON analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Queue poll + recovery sweep both want to find pending rows fast.
CREATE INDEX IF NOT EXISTS idx_analyses_queue_pending
  ON analyses (status, source, created_at)
  WHERE status = 'pending';
