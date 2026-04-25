-- Phase 4: replace profile-as-CV with stance-as-emotional-position.
--
-- New columns on `users`:
--   stance            — which of the 4 stances the user picked at onboarding
--                       (curious_not_started | watching_not_doing | tried_gave_up | using_want_more)
--                       NULL for users onboarded before Phase 4 — Pass 2 of the
--                       verdict pipeline handles NULL gracefully.
--
--   intention         — optional "one small commitment for the next two weeks"
--                       captured via the new /context reflection prompt.
--                       NULL by default. Used as a soft tone signal in Pass 2.
--
--   pattern_to_stop   — optional "the pattern I want to step away from" line
--                       from the same reflection prompt. NULL by default.
--
-- The existing user_contexts table (role / goal / content_preferences /
-- extended_context) stays for back-compat reads — Phase 1 already removed
-- those fields from the verdict prompt. We do not delete data.

ALTER TABLE users ADD COLUMN IF NOT EXISTS stance text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS intention text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pattern_to_stop text;

-- Soft validation: stance must be one of four values when set. NULL is allowed
-- (existing users, or users who haven't picked yet).
-- Wrapped in DO block so re-running the migration is idempotent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_stance_valid'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_stance_valid
      CHECK (
        stance IS NULL OR stance IN (
          'curious_not_started',
          'watching_not_doing',
          'tried_gave_up',
          'using_want_more'
        )
      );
  END IF;
END $$;
