-- Premium tier + Stripe customer tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS premium boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_since timestamptz;
