-- Free chat preview: every user gets a small daily allowance of chat messages
-- so non-premium users can taste the relationship layer of the product before
-- being asked to upgrade. Rolls 24h after the first message of the window.
--
-- Premium users bypass this gate at the application layer, but we still let
-- the columns exist on every row so the gate logic is uniform.

ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_chat_count integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_chat_reset_at timestamptz;
