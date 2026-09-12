# ContextDrop build plan

Build the first complete Instagram-to-result journey on `codex/contextdrop-next`. Keep the existing app available while the new path is validated. A new branch does not imply deleting the working evidence modules or beginning a second unrelated product.

This is the canonical implementation sequence and acceptance scorecard, revised after the [second research pass](deeper/README.md). Targets in the research appendices are proposals; the consolidated gates below take precedence. No gate is passed merely because this document exists. Calendar estimates should follow the capture/runtime spikes, since account access and platform behavior are the largest unknowns. Build the evidence capability inside an existing agent before investing in a separate elaborate interface.

## Outcome contract

The first release must support this interaction without developer intervention:

> Paste a real Instagram AI post. Ask which resource is shown. Inspect its evidence. Choose to try its documented example. Watch the work. Open the result and see what was checked.

Photos and mixed carousels are part of that contract. A tool roundup must also support a useful question without proposing a build. Browser work is part of execution; terminal launch alone does not satisfy it.

Use the source URL, exact post identity, ordered assets and user's actual goal throughout. An inaccessible asset is a visible partial state. A similar repository is a candidate until source identity is established. A successful subprocess is finished work awaiting verification. These distinctions belong in the data and tests; the interface can express them in plain language.

## 0. Freeze a useful outcome and compare existing tools

Select six real reference tasks across resource identification, running a documented example and adapting a visible UI behavior. Define the desired result and correct source evidence before testing. Use Reelnest or an existing reader for comparable understanding questions, and Gemini plus an existing coding agent/skill for action tasks. Preserve attempts, time, interventions, unsupported claims and actual results. A paid feature must improve a measured problem beyond a prompt handoff. Do not assume the open-source competitor's published verification works until exercised.

Create the smallest reusable evidence tool needed to test that difference. A local CLI/skill with source records and inspectable evidence is sufficient for the first comparison; the later Mac UI should call the same service. The public research and synthetic experiments are not this test. This phase runs alongside the bounded acquisition spike below, not a second architecture project.

**Exit:** concrete comparative results and the chosen first user job. If the useful difference is only evidence acquisition, preserve it as an agent integration rather than building a second general agent interface. The initial comparison is exploratory; the later locked release corpus and user pilot remain separate gates.

## 1. Prove acquisition and choose one harness

**Acquisition spike:** define an adapter result containing post identity, caption, author, ordered image/video assets, acquisition method, availability and structured failure. Exercise a real Reel, image and mixed carousel through direct/public retrieval, a narrow pinned OpenCLI `download` reader using a connected browser, and the existing Apify fallback where needed. Compare complete correct imports, reliability and cost; neither is presumed the winner. OpenCLI's `post`/`reel` commands publish and are outside this read adapter. Adapt Apify's mixed-media output rather than forcing it into `ScrapedVideo`. Never harvest login credentials to get a test through. Compare actual assets to the visible original, including slide count/order. Retain failures in the record.

**Runtime spike:** time-box the managed Agents API with an isolated local executor using the current official setup, which currently includes an alpha CLI. Confirm compatible versions, model/effort, evidence tool calls, streamed progress, a file change, a browser observation, cancellation and reconnect. The existing installed SDK needs updating in an isolated development context before copying modern API examples. If account access or runtime maturity blocks this, use pinned local Codex app-server for private validation and record the release limitation. Select only one execution runtime for the next stages. Ordinary content reading/chat should use the chosen Gemini model; benchmark Flash versus Lite and reserve Astra budgets for difficult reasoning/actions. Keep one durable user conversation with source/result references across provider calls.

**Exit:** three correct post types, an evidence call and a real checked local artifact. Record provider/runtime versions, failure modes, time and cost. No redesign or broad migration until the acquisition path is viable.

## 2. Build one durable content session

Create `next/core` for stable source/evidence/action contracts and `next/service` for the local service. Reuse existing small readers/resolvers through adapters. Keep imports from `web/src/lib` out of the eventual core; move or extract shared pure functions as needed. The service owns one SQLite database and an asset directory, outside public/static paths. The UI becomes a client.

| Record | Responsibility |
| --- | --- |
| Source | Canonical origin, exact post identity, content type, acquisition state |
| Asset | Ordered image/video/page/audio, local identity, hash, dimensions and measured duration |
| Evidence | Original asset reference, presentation timestamp or slide, crop/bounds, extraction method, text alternatives |
| Session | Conversation and selected project, runtime session ID, immutable source references |
| Job | Queued/running/partial/completed/failed/cancelled state, attempt, lease, heartbeat, progress and usage |
| Action | User goal, approved work scope, evidence, executor, run state and idempotency key |
| Artifact | Real file, preview or observed external state associated with the action |
| Check | What was tested, actual observation, pass/fail, checker identity and time |

Acquisition state and analysis state must be separate. A caption arriving does not mean video analysis is complete. Save work incrementally; reselecting another source must not overwrite an active job. Recover orphaned jobs after restart, and never automatically replay an external side effect whose outcome is unknown. Resume from observed state instead.

**Exit:** importing two posts, changing selection and restarting preserves both conversations and job states. Duplicate submissions return the same job/action. No global active-source JSON is the new path's system of record.

## 3. Give the agent reliable eyes

Implement a measured audiovisual reader and a separate original-frame detail pass. Start with Gemini and local Apple Vision; compare native agentic and static modes before selecting defaults. Preserve actual presentation timestamps for variable-frame-rate media. Extend detailed inspection to every retained video asset, including social downloads, rather than only YouTube URLs and uploads.

The original video remains available for targeted rereading. Frame/text-change candidates must be measured for brief-event preservation; exact crops and surrounding frames support OCR and interpretation. The [harder synthetic experiment](deeper/FRAME-STRESS.md) found the existing simple detector discards readable low-contrast text and retains every frame under motion. Do not promote it to production as-is. Test region-aware alternatives, preserve uncertain intervals for exhaustive rereading, and never disguise a candidate budget cap as complete inspection. Negative examples must return uncertainty, not a plausible invented resource. Full original-frame accounting and correct recognition are separate metrics.

Expose `read_source`, `search_evidence`, `inspect_moment`, `resolve_resource`, and `get_project_context` to the harness. A source-backed factual answer must resolve to an actual evidence record the UI can open. A claim checked online uses the external verification source as well. No provider selection menu is required in normal chat.

**Exit:** the locked evaluation set meets the evidence gates below, including late-video and absent-prompt questions. Exportable evidence survives model/provider changes.

## 4. Close the action loop

Connect the chosen harness to the same conversation. Start with resource discovery, running a minimal documented repo example and a bounded browser task. Scope code changes to a new workspace or an explicitly chosen project/worktree. Reuse existing credential separation and source-bound task context.

Show a compact action description: what it will accomplish, where it will work, expected cost range and any decision needed now. Ordinary authorized work proceeds without per-click approval. The user can interrupt, steer or take over. The application must preserve actual permission decisions and reject stale approvals.

Completion requires checks appropriate to the action. A repository task checks repository identity and the requested example. A website task opens the preview and exercises the relevant behavior. A prompt extraction task checks text against the visible source. An independent checker or observable tool result—not just the executing model's assertion—produces the check record. Avoid pretending a single universal success score verifies all task types.

Native Mac control requires a separate connected capability, with app/coordinate identity, OS permissions, fresh observations and cancellation. Test each native app/action class before naming it as supported. One successful native-app case does not justify a broad “controls your computer” claim. Name the specific browser, coding and native capabilities actually verified.

**Exit:** at least three unassisted real UI source-to-action sessions covering resource discovery/opening, a repo example and UI adaptation, including Instagram and browser work; the result and checks return to the original chat. A zero-exit/no-artifact run, failed test and premature browser finish all remain unverified.

## 5. Validate retention before widening scope

Begin observed user attempts as soon as phase 4 supports the bounded journey; do not wait for full Mac packaging or phone delivery. Recruit ten Mac users with an active project who already save AI content and use a coding agent. Obtain their own recent examples; do not select only easy demonstration posts. For blinded output-quality scoring, use identical source/task inputs across tools. For user-effort comparisons, use matched tasks and counterbalanced tool order to reduce learning effects. Record useful results, errors, user effort, elapsed time and cost. Record assisted setup as assistance, not successful self-serve onboarding.

A proposed commercial gate is that at least six of ten return voluntarily for a second useful task during two weeks and at least three accept a paid pilot after use. These are decision thresholds, not statistical proof of product-market fit. Run no outreach or payment collection until specifically authorized.

If capture is valuable but execution is rarely used, prioritize the content/evidence MCP bridge. If project adaptation drives repeat use and payment, expand those actions. Additional social platforms, workflow marketplaces, team accounts, broad native control and sophisticated library indexing must earn their place through these observations.

## 6. Package the premium experience

Proceed with full packaging after the phase 5 pilot shows a useful comparative advantage; do not treat an attractive prototype as that evidence. Apply [DESIGN.md](DESIGN.md) to the proven flow. Use a single conversation with a collapsible evidence/result area. Retain useful drafts, keyboard operation, clear progress, retry and interruption. The first useful insight should arrive before optional deep indexing finishes, but its evidence limits must be explicit.

Package the TypeScript service and React UI as a Mac app after their behavior is stable. Use a typed native boundary and the least native code necessary. Test installation, permissions, credentials, quit/relaunch and updates on a second Mac without undocumented terminal setup. The current development-only Next route is not the distributable product.

Phone-to-Mac delivery is necessary before advertising the phone-sharing hero as available; it does not block the first Mac-only private validation. Build one small authenticated inbox/share path with device pairing and queued delivery; verify that a shared link reaches the correct Mac even if it reconnects later. Do not build a full social inbox, native iOS app and cloud media archive just to prove sharing. Specify the actual supported share surface after a device test, not an assumed PWA capability.

Record the hero demonstration from the working flow. A generated phone/brain illustration can be supporting art; generated screenshots or simulated terminal output are not product evidence.

**Exit:** a new user pastes or shares an eligible post, asks a question and finishes a supported action without a developer. Motion/keyboard/reduced-motion behavior works, and the landing page states only capabilities demonstrated on the release build.

## Canonical acceptance scorecard

Freeze the evaluation manifest before running comparisons. Expected answers stay outside model inputs. Preserve attempts, including failures. Use a separate held-out subset for the release check; do not repeatedly tune and report on the same examples.

| Area | Proposed release target |
| --- | --- |
| Instagram | 24 independently selected eligible public AI posts: 8 Reels, 8 photos, 8 carousels. At least 23/24 fully acquired, all assets/order correct for a pass, zero wrong-post successes. Report each type and every attempt; this small set does not justify a universal reliability claim. |
| Failure recovery | Deleted/private/login-required/rate-limited/partial cases show the right state; user-supplied fallback continues the same session without disguising a failed link import. |
| Brief clues | 40 synthetic clips spanning 1/2/3/6/15-frame clues, randomized start phases, resolution, motion, compression, contrast and variable FPS. Establish human-legibility labels independently. At least 95% candidate recall for readable clues; publish the single-frame bucket and candidate workload under motion separately. The 14-case stress test is exploratory and does not pass this gate. |
| Recognition | At least 95% exact normalized repo/URL matches on legible targets; report prompt character errors. Zero invented “extracted” resources on negative controls. |
| Real video | 12 additional short videos and 8 videos of 20–60 minutes; human-labeled early/middle/late questions and required visual targets. At least 90% of answerable targets correctly recovered overall, with performance reported separately for fleeting visuals and each timeline segment; misses and abstentions count against recovery. Also require at least 95% support for audited factual claims, with working evidence links. Correct abstention on genuinely absent content is scored separately. |
| Action | Preassign 10 scoped tasks: 3 resource discovery/opening, 3 repo examples and 4 UI adaptations. At least 9/10 independently checked outputs overall; publish each class rate and require at least one checked end-to-end UI journey per class, including browser work. Native-control claims are limited to the app/action classes separately tested. |
| Honesty | Simulated process success without result, incorrect repo, failed checks and absent text never produce a verified badge or fabricated exact extraction. |
| Resilience | Cancel, disconnect, kill/restart, resume and duplicate submission tested at acquisition, analysis, approval and execution. No lost result or silently duplicated consequential action. |
| Experience | Measure useful-answer and completed-analysis times separately. Initial target: median first useful short-post answer under 45s and follow-up answer under 15s; publish p95/network/hardware. No fixed total-video-length claim disguised as processing time. |
| Cost | Per-source/per-task actual usage and retries recorded, unknown charges visible, user-extensible budgets. No unlimited plan until tail costs are measured. |
| Distribution | Second-Mac installation and the promised phone-share surface verified without developer assistance. |

## Branch discipline

Implement each phase as a reviewable commit series. Run focused tests for changed behavior and real journey checks; component-test totals are not release proof. Preserve the existing checkout's saved content. If importing old private state, back it up and use an explicit, reversible migration. Retire the old runtime only after the new route passes the same source-to-result examples.

The research phase has created the branch, reports, a live competitor observation and offline mechanism/stress experiments. The next implementation starts with phase 0 and the bounded phase 1 spikes. No integrated provider runtime, production deployment or completed reboot is implied by this plan.
