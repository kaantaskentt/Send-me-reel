-- Allow web-only users (email+password signup) without a telegram_id
ALTER TABLE users ALTER COLUMN telegram_id DROP NOT NULL;
ALTER TABLE users ALTER COLUMN telegram_id SET DEFAULT NULL;

-- Remove the UNIQUE constraint so multiple web-only users can have NULL telegram_id
-- First drop the index, then recreate it as a partial unique index (only on non-null values)
DROP INDEX IF EXISTS idx_users_telegram_id;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_telegram_id_key;
CREATE UNIQUE INDEX idx_users_telegram_id ON users(telegram_id) WHERE telegram_id IS NOT NULL;
