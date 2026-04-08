-- Add email column for email-based auth (magic link)
-- telegram_id remains for bot users, email for web signups
ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email) WHERE email IS NOT NULL;

-- Make telegram_id optional (was required before, now users can sign up with email only)
ALTER TABLE users ALTER COLUMN telegram_id DROP NOT NULL;
