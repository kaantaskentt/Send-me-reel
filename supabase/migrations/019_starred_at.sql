ALTER TABLE analyses ADD COLUMN IF NOT EXISTS starred_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_analyses_starred ON analyses (user_id, starred_at) WHERE starred_at IS NOT NULL;
