# ContextDrop reboot: implementation audit

Date: 2026-09-12. Local code inspected at `ed2ec5ecc322c04e9de09a303e5ae9358889c712`, on `codex/contextdrop-next`. This is a read-only implementation review, not a fresh live-platform or execution test. Private captures, account data, and environment files were not inspected. No external code was installed or executed.

## Decision

Keep the evidence and execution boundaries. Replace the disconnected product flows with one local content session that persists **source → question → chosen action → actual result**. The failure is not absence of powerful models: the current main journey loses media types at ingestion, limits what can be re-inspected, and stops short of collecting a verified outcome.

The narrow first promise should be: **“Send an AI post. Find the useful thing in it. Try it on your Mac.”** Demonstrate this with a real Instagram Reel, photo, and carousel before adding more platform or workflow surface area.

## What the actual code does

| Area | Implemented behavior | Implication |
|---|---|---|
| Local routing | All Instagram, TikTok, and X URLs use `scripts/analyze-one.ts`; YouTube can use Gemini; other links use the page reader. `web/src/lib/capture-routing.ts:4–13`. | Routing is by platform hostname, not actual content type. An Instagram photo is sent down the video path. |
| Local social retrieval | `scripts/analyze-one.ts:1–5` imports `analyze-video.ts`. That script directly calls yt-dlp metadata, requires a video duration, then downloads with yt-dlp. `scripts/analyze-video.ts:107–135`. | The visible local app does **not** use the production Apify fallback. A scraper improvement in production does not repair this experience. |
| Hosted retrieval | `scrapeVideoWithFallback` tries yt-dlp, then Apify, but exits immediately for `NOT_A_VIDEO`. `src/services/scraper.ts:179–210`. Instagram Apify results are mapped to `ScrapedVideo` plus one video URL and a thumbnail. `src/services/apifyScraper.ts:134–189`. | There is no ordered image/video carousel contract. Image content is reduced to an article/caption path or rejected. |
| Source identity | Instagram shortcode matching rejects unrelated Apify results; X status IDs are compared explicitly. `src/services/apifyScraper.ts:88–115`. | Good protection worth retaining. Do not equate “an actor returned something” with the requested post. Extend exact identity checks to every adapter. |
| Detailed video | At most 96 JPEG frames, width 1280, source duration up to 600 seconds. Preferred intervals are 1/2/3 seconds, stretched further for long videos. `src/services/frameExtractor.ts:12–39`. Audio transcript has no segment timestamps. `scripts/analyze-video.ts:161–166`. | Cannot reliably catch a fleeting prompt or accurately align speech with an individual screen action. The source video is saved, but chat does not expose arbitrary re-extraction from this local captured video. |
| Native Gemini video | Supports measured durations up to 60 minutes in 10-minute chunks, with a checkpoint fingerprint and completed-range accounting. Overview uses 1 FPS/low resolution. `src/services/geminiVideo.ts:4–9,103–109,323–365`. Focused follow-up is up to 30 seconds at 2 FPS/high resolution. `:303–319`. | Much better long-video substrate, but “complete” means requested chunks returned model observations. It does not mean all original frames or tiny text were understood. |
| Uploads | Stored file identity, path containment, limits, file validation, and Gemini file cleanup are implemented. `src/services/uploadStore.ts:56–103`, `src/services/uploadedContent.ts:65–101`, `src/services/geminiFiles.ts:27–62`. | Useful reusable media primitives. Uploads do not fix direct Instagram post import. |
| Stronger local chat | Full stored-source search; saved-source retrieval; image inspection; focused upload and YouTube re-inspection; public web/GitHub search and repo verification. `web/src/lib/local-conversation.ts:37–57,118–209`. | Good grounded investigation core. It should become the sole conversation engine. Search of stored observations cannot recover an original frame never observed. |
| Local chat budget | Five model rounds, eight custom tool calls, a three-minute deadline, recent 12 messages, 100 daily attempts. Default model is `gpt-5.4-mini`, low reasoning. `web/src/lib/local-conversation.ts:94–113`; `web/src/app/api/local/chat/route.ts:30–46`. | Stronger builder settings in this Codex task do not automatically upgrade the product's model. Limits are scattered instead of one user-visible work budget. |
| Hosted chat | A separate implementation provides transcript prefix up to 4,000 characters and visual summary prefix up to 1,500 characters, plus web search. `web/src/app/api/analyses/[id]/chat/route.ts:169–186,213–219`. | The local and hosted product have materially different intelligence. There is no single claim “our chat supports this” across both. |
| Plan preparation | Goal, grounded evidence, observed/inferred steps, prerequisites and success criteria are validated; source IDs are assigned by server. `shared/execution-plan.ts:53–77`; `web/src/lib/plan-generator.ts:25–46`. | Retain this data contract, but present a compact outcome/action in chat. Do not force every simple “open this repo” through a long plan screen. |
| Terminal execution | A fresh local Git workspace receives task/evidence files and a new Codex or Claude process is launched in Terminal. `companion/server.ts:152–184`. Claude begins in plan mode. Codex exec mode has a 20-minute runtime limit. `companion/runner.mjs:34–44,92`. | This is a new-session handoff, not general management/resumption of arbitrary Codex sessions. A terminal window opening is not execution proof. |
| Browser execution | Dedicated visible Chromium, observed DOM + screenshot, allowed actions, target highlighting and stale-target checks. `companion/browser.ts:55–71,87–110,168–229`. Every navigate/click/fill/back requires approval; 30-action ceiling. | Useful prototype for supervised browser work, not unrestricted native Mac control or an existing logged-in browser. Repeated approvals create friction for ordinary reversible steps. |
| Outcome | Codex zero exit and browser `finish` both set `finished_unverified`. `companion/runner.mjs:107–112`; `companion/browser.ts:162–165`. The local result-banner loader accepts only an old `http://127.0.0.1:3130/` demo URL. `web/src/lib/local-studio.ts:59–64`. | There is no generic verifier-to-result contract. The app cannot yet close the loop for arbitrary work. This is the largest execution gap. |

## Where complexity comes from

1. **Several product runtimes coexist.** Telegram/hosted pipeline, hosted chat, local capture/chat, rehearsal, and a separate companion each own different pieces. The best local route is explicitly permitted only when `NODE_ENV=development` and `CONTEXTDROP_LOCAL_STUDIO=1` (`web/src/lib/local-studio.ts:6–14`). It is not a packaged desktop product that can be sold unchanged.
2. **Global files substitute for session storage.** Local capture overwrites one `local-analysis.json` after archiving; planning overwrites one `local-plan.json` (`web/src/app/api/local/capture/route.ts:34–66`; `web/src/app/api/local/replicate/route.ts:39–46`). This ties current UI selection to work state and creates special logic around source switching.
3. **Local job ownership is incomplete.** There is a launch lock, detached child, checkpoints and estimated active period; there is no unified durable claim/lease/heartbeat/cancel/recovery contract. A process dying while holding the launch lock can strand future starts; a timestamp is not proof the worker is alive (`capture/route.ts:37–39,61–73`; `capture-routing.ts:16–21`). The hosted queue has retry/claim/recovery logic, but is separate (`src/pipeline/queueWorker.ts:38–60,77–140`).
4. **Companion persistence is partial.** Run state files exist, but `runs`, `requests` and browser objects are initialized in memory and are not reconstructed on startup. `GET /runs/:id` only recognizes current-session entries (`companion/server.ts:66–74,105–108`). Restart loses run discoverability and idempotency history.
5. **Chat and action are different experiences.** The chat explicitly cannot operate the computer; it emits `prepare_task`, followed by another plan call and a separate panel (`local-conversation.ts:54–57`; `ContentStudio.tsx:156`). Terminal progress instructs the user to check Terminal, with no normal verified-result return to the original conversation (`ReplicationPanel.tsx:210`).
6. **Contracts carry historical assumptions.** `ScrapedVideo` and `ScrapedArticle` (`src/pipeline/types.ts:3–19`) do not model a mixed-media social post. A native observation is often stored in `frame_descriptions` even when no corresponding JPEG exists. Evidence source, media object, and observation need separate identities.

Do not spend a rewrite on replacing every existing module. Replace the orchestration seams first; keep tested small functions behind the new contracts.

## Reuse, adapt, retire from the new path

**Reuse:** URL/egress validation; exact post identity verification; Gemini structured parsing and completed-range checkpoints; upload bounds and containment; public GitHub identity-versus-existence resolver; source search; source-bound reply parsing; observed/inferred evidence discipline; credential stripping; fresh workspaces; stale browser approval checks. These protect the promised experience instead of adding visible complexity.

**Adapt:** source evidence into `Source / Asset / Observation`; clip inspection to accept any retained media asset, not YouTube-only or upload-only identities; the conversation tool loop into one service shared by UI/runtime; companion into a durable executor adapter; success criteria into verifiable checks tied to artifacts. Keep profiles/workflows as optional data, outside the first-run journey.

**Retire from the new journey:** global active-source files as primary state; separate hosted/local intelligence; legacy classification/verdict/research passes that do not help the current user question; mandatory large replication-plan UI for simple tasks; per-click approval on every ordinary reversible action; demo-specific result handling; “all platforms” or “every millisecond” readiness claims.

## Agent-Reach: useful layer, not the missing brain

Inspected current `main`, commit [`da5044d26fc6adddb6554d5679c94ac22e76e428`](https://github.com/Panniantong/Agent-Reach/commit/da5044d26fc6adddb6554d5679c94ac22e76e428), read through public GitHub/raw endpoints. Its own [base channel code](https://github.com/Panniantong/Agent-Reach/blob/da5044d26fc6adddb6554d5679c94ac22e76e428/agent_reach/channels/base.py) describes health checking and ordered backend selection; agents call upstream tools directly. Adopt this capability-report pattern: installed, connected, target content retrieved are distinct states.

Current [Instagram channel](https://github.com/Panniantong/Agent-Reach/blob/da5044d26fc6adddb6554d5679c94ac22e76e428/agent_reach/channels/instagram.py) delegates to OpenCLI. Its [social reference](https://github.com/Panniantong/Agent-Reach/blob/da5044d26fc6adddb6554d5679c94ac22e76e428/agent_reach/skill/references/social.md) documents an existing logged-in Chrome session for user search, profile, recent posts, Explore and saved posts. It does not document an exact arbitrary Reel URL → downloaded original media → all carousel assets contract. Actual adapter output must be tested before promising that capability.

The [OpenCLI channel helper](https://github.com/Panniantong/Agent-Reach/blob/da5044d26fc6adddb6554d5679c94ac22e76e428/agent_reach/channels/_opencli_site.py) returns a warning even when its bridge is connected: target-platform login and commands were not live-verified. The [YouTube implementation](https://github.com/Panniantong/Agent-Reach/blob/da5044d26fc6adddb6554d5679c94ac22e76e428/agent_reach/channels/youtube.py) checks yt-dlp and optionally delegates audio transcription. [Video docs](https://github.com/Panniantong/Agent-Reach/blob/da5044d26fc6adddb6554d5679c94ac22e76e428/agent_reach/skill/references/video.md) describe metadata, captions, comments and audio fallback. None supplies visual understanding of fleeting text.

Recommendation: investigate the relevant upstream OpenCLI adapter behind a narrow acquisition interface. Do not install Agent-Reach as the app's general authority or advertise all its listed platforms as tested ContextDrop support. Its routing philosophy is reusable; its installation success is not product acceptance.

## Minimum new vertical slice

One local desktop runtime, one durable database, one workspace UI, one conversation/execution session. Proposed records: `sources`, `assets`, `observations`, `messages`, `jobs`, `runs`, `artifacts`, `checks`. SQLite is a sensible first local store; no vector database or multi-agent backend is needed to prove the first journey.

```text
Paste/share post
  → Resolve exact post + caption + ordered media assets
  → Quick useful read + evidence timeline
  → Ask a question / inspect original detail when needed
  → Choose one useful action with a clear scope
  → Codex/browser executor in a visible workspace
  → Check actual output → return artifact + evidence to the same chat
```

Acquisition adapters should return explicit `complete`, `partial`, `needs_login`, `unavailable`, or `unsupported` states, with attempts and exact identity. A photo stays a photo; a carousel preserves order, captions and mixed media. Accessible media is retained under source-owned IDs for later inspection. A failed video download must never silently become “video analyzed” from caption alone.

For fleeting screen text, retain the original media and implement a **separate detail-capture pass**: decode all available source frames for inexpensive change detection, inspect text/scene changes, deduplicate unchanged regions, then send relevant high-resolution crops plus temporal context to the model. This is a proposal requiring benchmarks, not a guaranteed cure. OCR can misread or skip transitions; compression, motion blur and the source frame rate set a real information ceiling. If a prompt was never actually visible, no model can recover it as the creator's exact prompt. Surface a reconstruction as a reconstruction.

The first action should be **“Find the repo shown, open it in a coding session, and make its smallest documented example work.”** The session may investigate and adapt; success requires a verified repository identity or explicit candidate selection, the exact user goal passed to the executor, actual files, a executed check, and an openable output. Stop/pause/resume and result reporting are part of the same product slice, not follow-up infrastructure work.

## Acceptance gates before calling the new journey ready

These are proposed release gates, not claims of tests already passed.

| Gate | Required evidence |
|---|---|
| Real Instagram import | At least 20 independently selected accessible AI posts across Reels, single images and ordered/mixed carousels; record every attempt, exact shortcode, expected/received asset count, durations, captions, method, failure reason, latency and cost. Include at least 5 of each core type. No silent wrong-content results. Publish the measured success rate and denominator. |
| Retrieval failures | Invalid, deleted, inaccessible, login-required, rate-limited and partial-media examples produce an honest recoverable state; an upload/manual capture can continue the same source session without pretending the link retrieval succeeded. |
| Fleeting evidence | Human-labeled tests with URLs/prompts visible for 1, 2, 3, 6 and 15 frames at known frame rates, varying resolution, scrolling and blur; measure exact-text and correct-repo recall. Add real posts with short glimpses. Never replace recall results with “every frame decoded.” |
| Grounded questions | Users ask about an early visual, a late detail, audio-only detail, conflicting caption/screen detail and a deliberately absent prompt. Every factual source claim can open its matching image/page/time; unsupported exact text is rejected or labeled uncertain. |
| Useful recommendation | A showcase produces a useful choice, a design produces an applicable design action, and a tutorial produces an implementation option. Never require a build when the user only wants explanation or identification. |
| Actual action | Three real source-to-action sessions, including at least one Instagram source, run through the user UI without developer manually copying hidden state. At least one repo example builds/runs and one browser task shows its observed result. The original chat receives the artifact, checks and unresolved gaps. |
| Verification honesty | A process exits zero without an artifact, a test fails, and a browser agent says “done” early. None becomes “verified.” A distinct checker uses task-specific observable evidence. |
| Persistence and control | Restart during acquisition, inference, approval and execution; reconnect to the same job/run; stop works; resume avoids duplicate side effects; duplicate clicks do not create duplicate runs. |
| Fresh-user setup | A second Mac/user installs, connects credentials, imports a post and finishes an action without a developer terminal or undocumented env edits. Observe time to first useful answer and first verified outcome. |
| Cost and performance | Record p50/p95 on the test set by media type and length, including fallback attempts and re-inspection. Choose launch budgets from measured cost; show progress and an explicit option for deeper analysis. |

Only after this loop works should the app expand into generalized workflows, large saved libraries, additional platforms, or full native Mac automation. The winning claim is not that the model is omniscient: it is that ContextDrop reliably turns the relevant thing in a source into an outcome the user can inspect and use.
