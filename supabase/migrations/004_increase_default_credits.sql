-- Increase default credits for new users from 10 to 50
ALTER TABLE credits ALTER COLUMN balance SET DEFAULT 50;
