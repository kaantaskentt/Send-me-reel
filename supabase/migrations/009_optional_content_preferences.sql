-- Make content_preferences optional (Demi feedback: bot Q3 was confusing)
-- Existing rows keep their values; new profiles can omit this field.
ALTER TABLE user_contexts ALTER COLUMN content_preferences DROP NOT NULL;
