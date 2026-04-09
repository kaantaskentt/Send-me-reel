-- Add action_items column to analyses for cached personalized next steps
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS action_items jsonb;
