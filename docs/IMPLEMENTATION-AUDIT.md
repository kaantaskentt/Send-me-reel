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
| Reliability | The obsolete standalone analysis script required unrelated database/Telegram settings, and local and worker downloads could use different yt-dlp versions. | Database-independent evidence CLI, atomic private checkpoints and shared maintained downloader resolution with bounded 1080p formats. |
| Reliability | X video fallback was skipped because the configured bulk actor prohibited fetching a single tweet. | Use the documented single-status actor, one exact URL/item, an actor-charge ceiling and strict returned tweet-ID matching; known text-only posts skip it. Offline tested, not live X verified. |
| Reliability | Regex routing confused a platform hostname in a path/query or lookalike domain with the actual source. | Parse and classify the URL hostname. |
| Dependencies | Both runtime trees included known vulnerabilities. | Updated compatible dependencies, Next.js, image processing, and removed unused Anthropic SDK. Production dependency audits were rerun. |

The account/proxy findings above were verified in source and regression tests. No attack was executed against a live user account or deployed service.

## Execution boundaries

The plan is bounded data. Model-produced source text is never interpolated into a shell launcher. The Terminal runner passes a fixed prompt to the installed Codex CLI using argument arrays and normal workspace/approval controls. Interactive mode remains the default. The opt-in exec mode streams structured events with a 20-minute limit; the confirmed sprint build selected `gpt-5.4-mini`, `workspace-write` and on-request approval. Execution is local, not a cloud deployment.

The guided browser accepts a small typed action set, not arbitrary selectors, JavaScript or shell commands. The user reviews navigation/click/fill/back actions. Click approvals bind the observed page and actual DOM element; changed targets require a new inspection. Private fields use manual handoff. Stop closes the controlled browser and its network proxy.

The browser uses a fresh isolated profile. Its egress proxy resolves and pins public IPs, blocks private destinations, bounds transfer sizes, and closes outstanding connections on stop. This is not a full-machine sandbox or a guarantee that a user-approved website action is harmless.

## Evidence states

- **Prepared:** source-linked task exists; no action has run.
- **Launching:** a local runner was requested; the real process has not reported running.
- **Running / awaiting approval / needs input:** current execution state.
- **Finished, unverified:** the agent ended or reported a result; the user must inspect artifacts/checks.
- **Failed / stopped:** partial actions may remain; stopping does not roll back prior external changes.

## Verification performed

The root regression suite passed 84 tests, including eight embedded PostgreSQL checks. Backend build, companion TypeScript checks, and the optimized web production build passed. Three focused web UI tests passed, including desktop/mobile workbench and local-studio coverage. See [the verification record](VERIFICATION.md) for commands and evidence boundaries. The checked-in tests cover synthetic frame extraction, evidence/reference validation, queue/refund/persistence behavior, URL/command/proxy boundaries, account ownership, loopback pairing, acquisition fallbacks and Chromium interactions. Default web UI tests use clearly labelled fixture content and controlled API responses.

The sprint also completed a real provider path: Creator Magic's 533.293-second public Codex tutorial was downloaded, transcribed by `whisper-1` into 8,806 characters and analyzed as 95/95 timestamped frames by `gpt-5.4-mini`. A real 15-step plan then drove a local Codex exec-mode build of the wizard-themed block-breaker game. Independent browser QA found a resize defect in the generated output; one focused post-generation correction was applied, with the original source and failure evidence preserved. The complete 16-check Chromium pass then succeeded, covering actual gameplay, controls, state transitions and desktop/mobile-emulated layouts. This is a verified local recreation with an explicitly recorded QA correction, not a claim that the initial generation was perfect or that unseen creator code was copied exactly.

The real OpenAI browser planner also completed a controlled local fixture and public Example Domain/IANA flow. A separate Instagram acquisition smoke retrieved matching metadata and a 64.223537-second, 10,232,788-byte video/audio file without AI or Apify calls. These results are distinct from mocked tests. X/TikTok live capture and representative multi-platform/model evaluations remain open.

Full dependency audits of this branch's root worker and `web/` packages reported zero known advisories at check time. The separate legacy `landing/` and `landing-v2/` dependency trees were not remediated; GitHub still reports advisories on the default branch. This is not a repository-wide clean bill of health, and zero known advisories is not proof that an application is secure.

## Required setup and remaining limits

- Provider credentials were unavailable initially, then the original project's environment was privately restored for the authorized sprint. Keys were not printed or committed. The local studio and capture CLI run without database writes; their real provider success does not establish production account/database readiness.
- Apply migration `022_atomic_analysis_billing.sql` before using the new credit APIs. The updated code fails closed if required functions are absent. The migration passed eight tests executing its SQL in embedded PostgreSQL (PGlite), including rollback, idempotency and role permissions. Production application and multi-connection contention testing remain separate.
- Instagram/TikTok/X/YouTube retrieval remains provider-dependent. Videos are capped at ten minutes. YouTube full evidence capture and one Instagram download were verified; X/TikTok live retrieval remains untested. No universal-link success guarantee or provider benchmark exists. The shared resolver now prefers explicit `YTDLP_PATH`, then project-local yt-dlp 2026.8.19 with certificate roots, then the system executable. The old global 2026.03.17 binary was not updated. The Docker image installs EJS extras and enables Node.js, following the [official yt-dlp setup](https://github.com/yt-dlp/yt-dlp/wiki/EJS); Docker itself was not built because its daemon was unavailable.
- Audio remains an untimed transcript. Sampled frames can miss quick instructions. The plan carries these limitations instead of fabricating evidence.
- Full native desktop control, saved authenticated browser profiles, voice guidance, automatic creation of third-party accounts, one-click distribution, and universal rollback are not implemented.
- The earlier interactive Terminal smoke established launch only. A later exec-mode run produced the source-linked game and passed independent checks after the documented correction. General native Mac control and every interactive permission flow remain outside that evidence.
- Browser guidance needs a configured OpenAI key and installed Chromium. Terminal execution needs the Codex CLI and its existing sign-in. Live browser checks succeeded on two limited tasks; task quality has not been established on a representative evaluation set or authenticated third-party workflows.
- The model's success report remains unverified by default. The generated game received a separate artifact-specific QA pass, including one correction; a general automatic evaluation/verification service is future work.
- `/replicate/local` and its loopback APIs are development-only. They use private, gitignored evidence files and a paired local companion. The illustrative `/replicate/demo` keeps execution disabled. Neither substitutes for verified production authorization, billing, deployment or onboarding.
- No production deployment or live database change is part of this local implementation.
