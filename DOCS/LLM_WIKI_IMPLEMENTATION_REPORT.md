# Per-User LLM Wiki Implementation Report

Date: 2026-05-02

This report summarizes the LLM-wiki work added to ContextDrop. The implementation follows the conservative sidecar plan from `TEMP-DOCS/LLM_WIKI_MULTI_USER_IMPLEMENTATION_PLAN.md`: it adds durable per-user memory for future chat personalization without changing scraping, analysis, verdict generation, or classification.

No local wiki folders or local Markdown wiki files are created. Wiki folders and pages are stored as Supabase/Postgres rows. Markdown is stored as text in `user_wiki_pages.body_md`.

## 1. Architectural Summary

The new system adds a per-user memory sidecar beside the existing product pipeline.

Existing flow remains:

```text
user shares source
  -> scrape/transcribe/analyze/research
  -> generate verdict
  -> write analyses row
  -> dashboard/chat continue working as before
```

New sidecar flow:

```text
durable app event
  -> immutable user_wiki_sources snapshot
  -> user_wiki_jobs queue row
  -> wiki worker compiles source into per-user folders/pages
  -> chat retrieves same-user wiki pages when available
```

The wiki is best-effort. If wiki enqueueing, compilation, or retrieval fails, the user-facing analysis and chat flows should continue to work.

## 2. Database Additions

Migration: `supabase/migrations/020_user_wiki.sql`

New tables:

- `user_wiki_sources`: immutable source snapshots from analyses, chat turns, profile edits, state changes, stars, and todos.
- `user_wiki_folders`: dynamic per-user folder tree. Folder paths are scoped by `user_id`.
- `user_wiki_pages`: compiled wiki pages. Page bodies are Markdown strings in `body_md`.
- `user_wiki_page_sources`: provenance links between pages and source snapshots.
- `user_wiki_links`: typed page-to-page graph edges.
- `user_wiki_jobs`: async compile queue.

Existing tables are not reshaped. The only existing-table changes are unique constraints on `(id, user_id)` for `analyses` and `chat_threads`, so wiki rows can enforce same-user foreign keys.

Every wiki table carries `user_id`. Composite foreign keys and RLS policies are used as defense in depth. Because the app uses service-role Supabase clients, application queries also explicitly filter by `user_id`.

## 3. Type Layer

File: `src/db/wiki.ts`

This file mirrors the wiki schema in TypeScript:

- source kinds and statuses;
- folder/page/link/job types;
- database row interfaces;
- canonical folder vocabulary.

The canonical vocabulary gives common folders stable names for product analytics, while still allowing dynamic per-user folders. Examples:

- `background`
- `goals`
- `working-style`
- `current-projects`
- `preferences`
- `topics/ai-agents`
- `topics/llm-memory`
- `sources/just-a-watch`
- `recipes`
- `places/restaurants`

## 4. Source Snapshot Layer

Bot-side file: `src/services/wiki/sourceBuilder.ts`

Web-side file: `web/src/lib/wiki/source-builder.ts`

These helpers create source snapshots and matching queue jobs after durable app writes. They are gated by:

```text
WIKI_COMPILER_ENABLED=true
```

When the flag is off, helpers are no-ops.

Events now enqueued:

- completed analysis from video/article pipeline;
- user chat message;
- assistant chat answer;
- analysis state change;
- star/unstar;
- todo creation;
- profile/context update.

For completed analyses, `just_watch` content is stored compactly. The source row still exists for recall and provenance, but low-action content does not bloat wiki pages by default.

## 5. Worker and Compiler

Worker file: `src/pipeline/wikiWorker.ts`

Compiler file: `src/services/wiki/compiler.ts`

The worker runs beside the existing analysis queue worker. It:

- polls `user_wiki_jobs`;
- claims pending jobs;
- retries failures up to a limit;
- recovers stale running jobs;
- marks jobs and sources as `done`, `ignored`, or `failed`.

The compiler:

- seeds starter folders for each user;
- loads existing same-user folders/pages;
- asks an LLM for a bounded folder/page/link proposal;
- validates and sanitizes paths, page types, folder types, and relations;
- falls back to deterministic compilation if the LLM fails;
- creates or updates wiki pages;
- links pages to source snapshots;
- adds page-to-page relations when both pages belong to the same user;
- maintains special `index` and `log` pages.

The compiler prompt explicitly says it must not change scraping, source analysis, verdicts, or action lanes. It only learns from finished artifacts.

## 6. Chat Retrieval

Retrieval file: `web/src/lib/wiki/retrieval.ts`

Chat route: `web/src/app/api/analyses/[id]/chat/route.ts`

Dashboard chat now optionally retrieves wiki context for `session.sub` only. Retrieval is also gated by `WIKI_COMPILER_ENABLED`.

The retrieval layer pulls:

- pinned profile/preference/project pages;
- pages linked to the current analysis source;
- keyword-matching pages from the latest user message;
- only active pages for the same `user_id`.

It formats a compact prompt block:

```text
--- PERSONAL WIKI CONTEXT ---
Use only as personalization context...
```

This block is appended after the existing content and subject-research context. If no wiki pages exist, chat behaves as before.

Action tags such as `[ACTION:add_task:...]` are stripped from retrieved wiki text before injection, so old assistant messages cannot accidentally trigger new actions.

## 7. Isolation and Safety

Isolation is handled at several layers:

- Every wiki table has `user_id`.
- Wiki table relations use composite same-user constraints where possible.
- `chat_message_id` ownership is validated through a database trigger.
- App queries always filter by `user_id`.
- Chat retrieval filters formatted pages by `user_id` again before building prompt context.

Added test:

- `web/e2e/wiki-retrieval-isolation.spec.ts`

The test verifies that two users can have the same wiki page path, and only the requesting user’s page enters prompt context.

## 8. What This Changes for Users

For new activity after the feature flag is enabled:

- saved sources become durable wiki source snapshots;
- chat turns can become durable memory;
- stars, todos, and state changes become preference/action signals;
- the wiki accumulates profile, preference, topic, and source-linked pages;
- chat can answer with more continuity because it sees compact same-user memory.

For old records:

- existing analyses and chats still work as before;
- they do not automatically benefit from wiki memory;
- they can be added later by a controlled backfill job.

## 9. What Was Intentionally Not Changed

The implementation does not change:

- URL routing;
- scraping;
- download fallback logic;
- transcription;
- visual analysis;
- subject extraction;
- subject research;
- verdict generation;
- verdict classifier behavior;
- action lane decisions.

The wiki is not currently used to influence verdicts. It is used only as memory for future chat personalization.

## 10. Verification Performed

Verification completed during implementation:

- root TypeScript compile: `npx tsc --noEmit`
- web TypeScript compile: `cd web && npx tsc --noEmit`
- migration application in disposable Postgres 16 container
- focused Playwright isolation test:

```text
cd web
npx playwright test e2e/wiki-retrieval-isolation.spec.ts
```

The focused Playwright test passed for both configured projects.

## 11. Remaining Work

Recommended next steps:

- Add user controls: inspect memory, forget page, forget source, export, delete all wiki memory.
- Add a backfill job for old analyses and chat history.
- Add admin-safe metrics for compiler jobs, folder growth, custom folder frequency, and retrieval hit rate.
- Add retrieval quality evaluation: when wiki context helped, when it was irrelevant, and when it should have stayed silent.
- Add UI for viewing wiki pages if the product wants users to inspect what the system remembers.

