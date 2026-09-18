# ContextDrop — current development handoff

Updated 18 September 2026. Read this, `AGENTS.md`, `web/AGENTS.md`, then the linked implementation notes before changing code.

## Use this checkout and branch

- Active Mac folder: `/Users/kaantaskent/Developer/send-me-reel`
- GitHub: <https://github.com/kaantaskentt/Send-me-reel/tree/codex/contextdrop-next>
- Branch: `codex/contextdrop-next`. Do not start from `main` expecting the current local product.
- Latest application change: `8df4b72` (dark workspace and supervised native Mac control). Later handoff-only commits do not change application behavior.
- `/Users/kaantaskent/Desktop/AI & Dev Projects/ContextDrop` is an older, separate checkout with uncommitted edits. It has been preserved. Do not reset it, overwrite it, or silently copy its files into this checkout. The routing note there points here.

## Product and current UX

Kaan wants to paste/share AI-related content, get three short useful choices, chat with source evidence, and act through his existing browser, coding app, or Mac apps. Keep the black/orange landing hero (“Your feed finally useful.”), the dark source-left/chat-right dashboard, short language, and result-first task view. Screenshots and proposed actions must not be presented as verified results.

The current implementation includes local source ingestion, Gemini video reading, transcript/frame evidence and focused inspection, source-aware chat, public resource/GitHub discovery, saved sources/conversations, iPhone inbox hooks, and task handoff to the paired companion. Media access and coverage are bounded; not every social URL or every frame is guaranteed.

## Run on this Mac

```sh
cd /Users/kaantaskent/Developer/send-me-reel
git status --short --branch
npm run personal -- --no-open
```

Open <http://127.0.0.1:3127/> for the landing page or <http://127.0.0.1:3127/replicate/local> for the workspace. The launcher reuses a healthy existing session. No Google/Supabase login is required for this local flow. It binds the app and companion to loopback and keeps the Mac awake while running. A separate `/replicate/demo` rehearsal uses recorded fixtures; it is not live execution.

On a new machine: use Node 24, install with `npm ci` and `npm --prefix web ci`, then follow README setup. The ignored root `.env`, `web/.env.local`, `.contextdrop` captures/state, CLI logins, Chrome selection and macOS permission grants do **not** come from GitHub. Never commit or print their secrets. Run outputs live separately in `~/Developer/contextdrop-runs`.

## Architecture and files

- `web/src/components/landing/`: landing hero and direct link handoff.
- `web/src/components/dashboard/ContentStudio.tsx`: source, choices, chat, evidence and action review.
- `LocalTasks.tsx`, `BrowserSession.tsx`, `LocalRuntimeStatus.tsx`: result-first tasks, screenshots/approvals, real setup state.
- `web/src/app/api/local/` and `web/src/lib/local-*`: development-only local APIs/state. Production must return 404 for these even with local opt-in enabled.
- `src/services/`: acquisition and evidence readers. Native media work crosses a local subprocess boundary; do not import it into the hosted Next.js app.
- `companion/server.ts`: paired loopback service on port 43187, task lifecycle, saved results.
- `companion/browser.ts` / Chrome pairing: explicitly selected existing Chrome, owned task tabs and reviewed actions.
- `companion/computer.ts` / `native-mac.ts`: supervised native Mac executor using Peekaboo 4.4.0 and the existing OpenAI account.
- `shared/execution-plan.ts`: source-bound data-only task contract.

## Known unfinished work — do not claim it is already working

1. Native Mac control was implemented and tested with fixtures. The signed helper and its real Bridge were verified locally, but Screen Recording and Accessibility were still disabled at the last live check on 17 September. Recheck status; after the user grants permissions, prove a harmless task end-to-end and test Stop/stale-screen recovery. This is Accessibility-based control, not unrestricted control of every app. The first version reviews every mutation and excludes coding editors, shells and private settings from GUI typing.
2. Existing Chrome must be selected/connected in the setup panel. A configured provider or a connected worker does not mean Chrome is connected. Never automate a random profile or read unrelated tabs.
3. Coding tasks expose files, logs and reports; a general verified “Open demo” preview URL is not yet part of every task result. The source panel displays captured evidence, not a retained full-video player.
4. The personal local flow and hosted dashboard/bot remain distinct. Do not remove hosted authentication to imitate the local flow. Authenticated production analysis, universal platform coverage and live native execution are not established by a green build.
5. The older `docs/next/` research is historical planning. Prefer current code and acceptance reports when its descriptions disagree with implemented behavior.

See `companion/COMPUTER-CONTROL.md`, `design-qa.md`, `docs/LOCAL-ACCEPTANCE-2026-09-15.md`, and `docs/CONTENT-COMPANION.md` for details.

## Validation and release discipline

The application at `8df4b72` passed 349 unit/integration tests, root build, companion/web TypeScript, web lint, and 26 content/task/setup/rehearsal browser cases across focused runs on 17 September. Browser fixtures mock providers/actions; these are not proof of live AI execution. The real saved Instagram conversation was also inspected in Chrome.

Before pushing, stage new source files and run `npm run check:hosted` as required by AGENTS.md. It performs a clean web-only production install/build, dependency/privacy trace audit and HTTP smoke checks. For code changes also run the prescribed unit/build/type/lint checks and affected browser cases. After a push, inspect GitHub Actions and Vercel for the exact commit.

Work stays on `codex/contextdrop-next`. Pushing this branch is not a production release; do not merge or promote to production without the user's instruction. Keep credentials, private captures and local helper binaries out of Git.
