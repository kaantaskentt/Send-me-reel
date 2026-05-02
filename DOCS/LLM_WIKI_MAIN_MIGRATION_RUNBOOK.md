# LLM Wiki Migration Runbook From `main`

Date: 2026-05-02

This runbook explains how to deploy and apply the LLM-wiki database migration when the production/deployed app tracks the `main` branch.

The wiki feature is feature-flagged. The safe rollout is:

```text
merge code to main with WIKI_COMPILER_ENABLED=false
  -> deploy app
  -> apply Supabase migration
  -> verify tables
  -> enable WIKI_COMPILER_ENABLED=true
  -> redeploy/restart
```

Do not enable `WIKI_COMPILER_ENABLED=true` before the database has the `user_wiki_*` tables.

## 1. Confirm You Are on `main`

```bash
git status --short --branch
git switch main
git pull origin main
```

If the wiki work is still only on `dev`, merge it into `main`:

```bash
git merge dev
```

Review what will be deployed:

```bash
git diff --name-status origin/main..main
```

Expected important files:

```text
supabase/migrations/020_user_wiki.sql
src/db/wiki.ts
src/pipeline/wikiWorker.ts
src/services/wiki/
web/src/lib/wiki/
web/src/app/api/analyses/[id]/chat/route.ts
```

## 2. Keep Feature Flag Off for First Deploy

In the production/deployed environment, make sure this is unset or false:

```text
WIKI_COMPILER_ENABLED=false
```

This means the deployed code will not enqueue, compile, or retrieve wiki memory yet.

## 3. Push Code to `main`

```bash
git push origin main
```

Wait for the hosting provider deployment to finish.

After deploy, do a quick smoke test with the flag still off:

- dashboard loads;
- existing analyses load;
- existing chat works;
- sending a new link still works as before.

## 4. Apply the Supabase Migration

Migration file:

```text
supabase/migrations/020_user_wiki.sql
```

### Option A: Supabase CLI

Use this if the repo is linked to the correct Supabase project.

Install/check CLI:

```bash
supabase --version
```

If the project is not linked:

```bash
supabase link --project-ref <your-project-ref>
```

Preview pending migrations:

```bash
supabase migration list
```

Apply migrations:

```bash
supabase db push
```

### Option B: Supabase SQL Editor

Use this if you do not have the CLI set up.

1. Open the Supabase dashboard.
2. Select the production project used by the deployed app.
3. Open SQL Editor.
4. Open local file:

```text
supabase/migrations/020_user_wiki.sql
```

5. Paste the full SQL into the editor.
6. Run it once.

If it succeeds, do not run it repeatedly unless you know the migration is idempotent for your exact DB state. Most table/index creation is guarded with `if not exists`, but the first two constraints are normal `alter table ... add constraint` statements and will fail if repeated after already being applied.

## 5. Verify the Migration

In Supabase SQL Editor, run:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name like 'user_wiki_%'
order by table_name;
```

Expected tables:

```text
user_wiki_folders
user_wiki_jobs
user_wiki_links
user_wiki_page_sources
user_wiki_pages
user_wiki_sources
```

Verify key constraints exist:

```sql
select conname
from pg_constraint
where conname in (
  'analyses_id_user_id_key',
  'chat_threads_id_user_id_key',
  'user_wiki_sources_analysis_user_fk',
  'user_wiki_pages_folder_user_fk',
  'user_wiki_page_sources_page_user_fk'
)
order by conname;
```

## 6. Enable the Wiki Feature

After verification, set this in the deployed app environment:

```text
WIKI_COMPILER_ENABLED=true
```

Redeploy or restart the app so the new env var is loaded.

## 7. Smoke Test After Enabling

Use one test account.

1. Send or save a new source.
2. Wait for the analysis to complete.
3. Check that one source and one job were created:

```sql
select source_kind, status, created_at
from user_wiki_sources
order by created_at desc
limit 10;

select job_type, status, attempt_count, error_message, created_at
from user_wiki_jobs
order by created_at desc
limit 10;
```

4. Check that pages are being compiled:

```sql
select path, page_type, revision, updated_at
from user_wiki_pages
order by updated_at desc
limit 20;
```

5. Open chat for the new analysis and ask a related follow-up.

Expected behavior:

- if wiki pages exist, chat gets compact personal context;
- if no wiki pages exist yet, chat still behaves normally;
- existing old records still work as before.

## 8. Rollback / Disable

Fast rollback:

```text
WIKI_COMPILER_ENABLED=false
```

Redeploy/restart.

This stops:

- source enqueue helpers;
- wiki worker compilation;
- chat wiki retrieval.

The new tables can remain in the database unused. Do not drop tables during an incident unless there is a clear data/security reason.

## 9. Important Notes

- This migration is additive, but it does add unique constraints to existing tables:
  - `analyses(id, user_id)`
  - `chat_threads(id, user_id)`
- The wiki feature initially affects only new events after the flag is enabled.
- Old analyses/chats are not automatically backfilled.
- A future backfill should be controlled separately because it may create many LLM jobs and database writes.
- Do not inject wiki memory into verdict generation in this rollout. Current implementation uses wiki memory only for chat personalization.

