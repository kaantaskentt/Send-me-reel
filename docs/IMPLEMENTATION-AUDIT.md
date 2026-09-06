# Implementation audit — 2026-09-06

Baseline: `kaantaskentt/Send-me-reel`, main commit `96f1a90cb63490abdaa82c29a4136cc299214b56`. Work was performed in a fresh local checkout on `codex/video-to-action`. The pre-existing Desktop checkout was preserved.

## Findings and changes

| Priority | Baseline problem | Change on this branch |
|---|---|---|
| Critical | User-controlled URLs were interpolated into shell commands in `src/services/scraper.ts` and `storage.ts`. Shell substitutions remained active inside double quotes. | Use `execFile` with literal argument arrays and argument terminators; restore certificate verification and bound downloads. |
| High | Media proxy accepted a blank configured secret and fetched arbitrary destinations, including unchecked redirects and unbounded bodies. | Fail closed on missing secret; CDN allowlist, public IP resolution, pinned TLS destination, redirect rejection and streamed byte limit. |
| High | A cross-account magic link could silently merge Telegram identity into an already signed-in Google account. | GET magic links refuse cross-account linking/session replacement; intentional linking needs its own ceremony. |
| High | Todo creation accepted an analysis owned by someone else, enabling disclosure through the task join. | Verify analysis ownership before inserting a todo. |
| High | Web retries could refund each failed attempt, and database write errors were silently ignored. | Terminal-only/idempotent refund design, serial worker processing, propagated persistence errors and atomic credit submission migration. |
| High | Source detail was reduced to 512px/low-detail frames, short free-form descriptions and a tiny summary. | Up to 96 frames across the full supported duration, 1280px images, high-detail structured observations, exact source timestamps, bounded concurrency and capture warnings. |
| High | A Telegram timeout could refund while background work continued and later wrote success. | Cancellation checks/propagation, guarded terminal writes, cleared timers and cleanup after actual work settles. Some in-flight provider/download calls still finish before cancellation is observed. |
| Product | Advice and to-dos did not produce an executable task or local action. | Authenticated planning workbench plus a paired Mac browser/Terminal companion. |
| Reliability | Regex routing confused a platform hostname in a path/query or lookalike domain with the actual source. | Parse and classify the URL hostname. |
| Dependencies | Both runtime trees included known vulnerabilities. | Updated compatible dependencies, Next.js, image processing, and removed unused Anthropic SDK. Production dependency audits were rerun. |

The account/proxy findings above were verified in source and regression tests. No attack was executed against a live user account or deployed service.

## Execution boundaries

The plan is bounded data. Model-produced source text is never interpolated into a shell launcher. The Terminal runner passes a fixed prompt to the installed Codex CLI using argument arrays and normal workspace/approval controls.

The guided browser accepts a small typed action set, not arbitrary selectors, JavaScript or shell commands. The user reviews navigation/click/fill/back actions. Click approvals bind the observed page and actual DOM element; changed targets require a new inspection. Private fields use manual handoff. Stop closes the controlled browser and its network proxy.

The browser uses a fresh isolated profile. Its egress proxy resolves and pins public IPs, blocks private destinations, bounds transfer sizes, and closes outstanding connections on stop. This is not a full-machine sandbox or a guarantee that a user-approved website action is harmless.

## Evidence states

- **Prepared:** source-linked task exists; no action has run.
- **Launching:** a local runner was requested; the real process has not reported running.
- **Running / awaiting approval / needs input:** current execution state.
- **Finished, unverified:** the agent ended or reported a result; the user must inspect artifacts/checks.
- **Failed / stopped:** partial actions may remain; stopping does not roll back prior external changes.

## Verification performed

The root regression suite passed 66 tests, including eight embedded PostgreSQL checks. Backend build, companion TypeScript checks, and the web production build passed. Two focused web UI tests passed at 1440×1000 and 390×844. See [the verification record](VERIFICATION.md) for commands and evidence boundaries. The checked-in tests cover synthetic video frame extraction, evidence/reference validation, queue/refund/persistence behavior, URL/command/proxy boundaries, account ownership, loopback pairing, and actual Chromium interactions with a deterministic fixture planner. Web UI testing uses clearly labelled fixture content and controlled API responses.

Production dependency audits check known package advisories at the time of the run. A zero-advisory report is not a proof that the application is secure.

## Required setup and remaining limits

- Real provider and Supabase credentials were unavailable in the new local checkout during initial verification. The original Desktop `.env` was an iCloud dataless placeholder. No live video/model/account flow is implied by offline tests.
- Apply migration `022_atomic_analysis_billing.sql` before using the new credit APIs. The updated code fails closed if required functions are absent. The migration passed eight tests executing its SQL in embedded PostgreSQL (PGlite), including rollback, idempotency and role permissions. Production application and multi-connection contention testing remain separate.
- Instagram/TikTok/X/YouTube retrieval remains provider-dependent. Videos are capped at ten minutes. No universal-link success guarantee or provider benchmark exists. The Docker image now installs the EJS extras and retrieval explicitly enables Node.js, following the [official yt-dlp setup](https://github.com/yt-dlp/yt-dlp/wiki/EJS). The local machine had yt-dlp 2026.03.17 at inspection; a maintained provider runtime is still required. Docker itself was not built because its daemon was unavailable.
- Audio remains an untimed transcript. Sampled frames can miss quick instructions. The plan carries these limitations instead of fabricating evidence.
- Full native desktop control, saved authenticated browser profiles, voice guidance, automatic creation of third-party accounts, one-click distribution, and universal rollback are not implemented.
- A real Terminal smoke test launched the runner and a Codex process, but did not produce a build artifact during observation; native Terminal inspection was blocked by Computer Use. Do not treat this as an end-to-end successful build.
- Browser guidance needs a configured OpenAI key and an installed Chromium runtime. Terminal execution needs the Codex CLI and its existing sign-in. Browser/model end-to-end task quality has not been established on a real evaluation set.
- The model's success report remains unverified. An artifact-specific evaluation/verification service is future work.
- No production deployment or live database change is part of this local implementation.
