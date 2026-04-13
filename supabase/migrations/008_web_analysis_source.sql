-- Add source column to distinguish how analyses are triggered (telegram bot vs web share)
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'telegram';

-- Index for the bot queue worker to efficiently find pending web analyses
CREATE INDEX IF NOT EXISTS idx_analyses_pending_web ON analyses (created_at)
  WHERE status = 'pending' AND source = 'web';
