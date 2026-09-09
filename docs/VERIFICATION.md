# Verification record — 2026-09-06

Environment: macOS, Node.js 24.13.0, Next.js 16.3.4, Chromium 1243 / Playwright 1.63. Source baseline main `96f1a90`.

| Check | Result | What this proves |
|---|---|---|
| `npm test` | 91 passed | Contract, API, ownership, network, acquisition/evidence, queue, billing, local studio, Terminal runner and controlled browser behavior |
| Embedded PostgreSQL | 8 tests included above | Actual migration SQL, rollback, duplicate submission/refund behavior, and RPC permissions |
| `npm run build` | Passed | Worker TypeScript compilation |
| `npm run check:companion` | Passed | Local companion TypeScript compilation |
| `npm --prefix web run build` | Passed | Optimized Next.js build and route generation |
| `npm run test:ui` | 3 passed | Desktop/mobile workbench, local studio and mocked-provider/companion approval UI |
| Targeted browser/security checks after highlight refinement | Passed | Actual Chromium click approval, stale-element rejection, and egress shutdown |
| `npm audit` | 0 advisories in the root worker and `web/` dependency trees | Known dependency advisories in those two trees at check time |
| Legacy production lockfile audits | `landing/`: 35 advisories; `landing-v2/`: 73 | Separate pnpm trees remain unremediated; neither is built by the current worker/web build |
| Legacy full lockfile audits | `landing/`: 99 advisories; `landing-v2/`: 137 | Each includes 2 critical development-tool advisories; separate historical deployments were not inspected |
| `git diff --check` | Passed | Patch whitespace consistency |
| Real YouTube evidence capture | Passed | A complete 533.293-second public Codex tutorial produced an 8,806-character transcript and 95/95 sampled frame observations |
| Real source-backed plan and Codex build | Passed | The real capture produced a 15-step plan, then an exec-mode companion run generated a local browser game |
| Independent generated-game Chromium QA | 16 passed after one documented correction | Actual gameplay, keyboard/pointer/touch controls, state transitions and desktop/mobile layout; no browser runtime errors |
| Real OpenAI browser planner | Passed on controlled fixture and public Example Domain/IANA flow | Live model decisions, reviewed browser actions and observed outcomes on these limited tasks |
| Production local-route exclusion | Passed | Actual production server returned 404 for local studio, capture, planning and frame routes; temporary server stopped |
| Instagram acquisition smoke | Passed; zero AI/Apify calls | Matching reel metadata and actual 64.223537-second, 10,232,788-byte video/audio retrieval |

These live checks are separate from the default regression suite. They establish the stated local paths and artifacts, not universal source support or a production deployment.

## Follow-up: a real metadata overflow and misleading capture status

The user's YouTube video `QhmhUgccaS0` failed during metadata retrieval at 16:30 UTC with `stdout maxBuffer length exceeded`. The old call buffered yt-dlp's complete JSON, including unused fields, until it exceeded 10 MiB. The video itself was within the ten-minute duration limit. Both the local CLI and production scraper now ask yt-dlp to project only consumed source fields, a format-presence marker, and bounded chapter fields before stdout reaches Node. The hard output limit is now 1 MiB. The exact source returned 2,350 bytes successfully. An offline integration regression uses real yt-dlp against a fixture larger than 12 MiB and verifies that unused captions/fragments are excluded.

The page previously displayed a generic failure alongside a false “Waiting for real source capture” panel. It now renders one live status, maps private diagnostics to safe, actionable messages, clears old failures on retry, and waits for capture startup before polling. An already-running capture returns its state on HTTP 409 so the UI follows it instead of reporting failure. Startup failures persist a failed checkpoint.

The real retry, analysis `9b7a1e12-19e3-448a-a0b7-7851674c8928`, completed at **16:40:17 UTC**, about 133 seconds after starting. The downloaded file was 67,916,385 bytes and measured 516.552 seconds. Whisper produced 9,767 characters (1,866 words); all 95 sampled frames were analyzed with zero failed frames. This is analysis evidence, not a generated website or completed execution task. The original failure checkpoint was preserved privately.

The 91-test suite, worker/CLI typechecks, and optimized Next.js build passed. The existing three UI tests passed. Separate browser checks verified the actual failure page, desktop/mobile layout, nine delayed-start/retry/failure assertions and eight assertions for joining an existing capture after HTTP 409, with intercepted requests and no paid model calls. QA files are under `/private/tmp/contextdrop-capture-failure-qa/`.

## Rendered UI

Flow: completed analysis -> choose goal -> prepare evidence-backed plan -> pair local companion -> start browser walkthrough -> inspect highlighted action in a wide session dialog -> approve -> see unverified completion -> close the controlled browser.

The default UI tests intercept remote planning and companion responses with clearly labelled fixtures. A separate companion regression uses actual Chromium and a deterministic planner against a local test page; it genuinely waits for approval, clicks, and observes changed content. These automated tests are distinct from the real provider and artifact checks below.

| UI check | Result |
|---|---|
| Page URL/title and meaningful content | Passed |
| Framework error overlay | None observed |
| Page runtime errors | None observed in tested flows |
| Source/evidence navigation and downloads | Passed |
| Approval, reject, resume, stop and reopen | Passed |
| Pairing token persisted to local/session storage | Not persisted |
| Desktop 1440×1000 | Passed |
| Mobile 390×844 | Passed; approval visible without scrolling |
| Screenshot inspection | Passed; fixture labels visible |

The dedicated Browser skill was unavailable, so Playwright was used for automated QA. The final workbench was also opened and inspected with Computer Use in the Codex in-app browser.

## Real source-to-game check

Source: [OpenAI Codex: Watch AI Create & Deploy Code! by Creator Magic](https://www.youtube.com/watch?v=Gda-1msq7pg). Analysis ID: `eddca104-82eb-4e8e-b65c-07c485752f33`.

The maintained project-local yt-dlp runtime downloaded 55,386,275 bytes. ffmpeg measured 533.293 seconds and extracted 95 timestamped frames across the complete source. `whisper-1` returned 8,806 transcript characters; `gpt-5.4-mini` produced 95 successful frame observations with no failed frames. The capture completed at 15:12:56 UTC. Sampling is approximately every 5.61 seconds, and speech has no segment timing. Those limitations and unreadable/uncertain observations remain in the checkpoint. See [the extraction record](VIDEO_EVIDENCE.md) for the reproducible command and model/cost bounds.

The real `gpt-5.4-mini` planner produced 15 steps, using the transcript and sampled observations. The goal explicitly restricted reproduction to the local wizard-themed block-breaker game before 4:11, excluding deployment, purchases, account creation and external services. The companion launched installed Codex in opt-in `CONTEXTDROP_TERMINAL_MODE=exec` with `gpt-5.4-mini`, workspace-write sandboxing and on-request approval settings. Run ID: `f9fc9c3a-7570-4b04-aa9f-fbfb5eaff0a4`. Codex generated `index.html`, `style.css`, `game.js` and a handoff.

Independent Chromium QA found a real defect after generation: resizing from desktop to phone left 39 blocks outside the playfield and could reattach a paused ball. One focused `game.js` correction recomputed geometry while preserving block state and the paused free ball. The original generated source, hashes and failure report were retained. All 16 browser checks passed after this correction at 15:34:25 UTC. The successful game is an original recreation informed by sampled evidence; it is not an exact copy of unseen creator source code, and the original CLI output did not pass unchanged.

Checks covered real ball/block collision and scoring, keyboard and pointer movement, pause/resume, restart, mute, touch controls, resize state preservation, desktop 1280×960 and mobile-emulated 390×844 layout. Win/loss transitions used controlled in-memory game states. Mobile emulation is not a physical-phone test. No browser runtime errors were observed.

Private evidence remains outside tracked source:

- `.contextdrop/local-analysis.json`, `.contextdrop/local-plan.json` and `.contextdrop/local-result.json` join the real source, plan and verified result.
- `.contextdrop/captures/eddca104-82eb-4e8e-b65c-07c485752f33/` preserves source media and all sampled JPEGs.
- `/Users/kaantaskent/Developer/contextdrop-runs/f9fc9c3a-7570-4b04-aa9f-fbfb5eaff0a4/project/` contains the playable artifact.
- That run's `control/` directory contains `BROWSER-QA.md`, `browser-qa.json`, the executable QA harness, before-fix evidence, original source/hashes and real desktop/mobile screenshots.

The local game preview binds loopback port 3130 and serves only the three game files. Plan, runner and report paths return 404. A portable copy of the final three files and their verification record is tracked in `examples/source-derived-game/`; `npm run local:result` serves this previously generated result without model calls. The local studio on port 3127 is development-only; this database-independent path is not the deployed authenticated product. The final optimized build completed without warnings, and all 62 file traces contained zero private `.contextdrop/` or `.env` files.

An earlier interactive Terminal launch reached `running` but produced no observed artifact; native Terminal inspection was blocked and that runner was stopped. The later exec-mode result above separately establishes successful AI construction and independent artifact checks.

## Other live checks

The browser's real `gpt-5.4-mini` planner was tested against a controlled local preview fixture and a public Example Domain/IANA navigation task. These checks used actual Chromium, reviewed actions and observed results. They do not validate arbitrary websites, authenticated accounts or high-impact transactions. The opt-in `tests/browser-openai.live.ts` fixture is separate from `npm test` and makes real provider calls.

The fixture took two model calls and 5.726 seconds; the harness checked the actual `Preview ready` result. Its proof is `/var/folders/v4/6vssxxr937d9mby4p2xp73_00000gn/T/contextdrop-openai-browser-smoke-GydwkE/live-proof.json`. The public task took three calls and 16.522 seconds and reached `https://www.iana.org/help/example-domains` with title `Example Domains`. Its proof is `/private/tmp/contextdrop-public-browser-live-thPTXp/live-proof.json`. These temporary proof files are local evidence and are not tracked deployment artifacts.

Instagram source `https://www.instagram.com/reel/DXk3S2QjQNd/` returned matching metadata and a 10,232,788-byte file containing video and audio. ffprobe measured 64.223537 seconds at 720×1280. `.contextdrop/platform-smoke/instagram-report.json` records this acquisition. It made zero AI or Apify calls, so it is download evidence rather than a full Instagram analysis test. X's single-status Apify fallback was updated and tested offline; X and TikTok live retrieval were not tested in this sprint.

## Not verified

- The separate legacy `landing/` and `landing-v2/` dependency trees were not remediated. Their production-only audits found 15 high/19 moderate/1 low and 17 high/48 moderate/8 low advisories respectively, with no critical production advisories. Full audits found 2 critical/50 high/45 moderate/2 low and 2 critical/52 high/74 moderate/9 low respectively. The critical development dependencies involve Vitest (`GHSA-5xrq-8626-4rwp`) and tar (`GHSA-23hp-3jrh-7fpw`). These were lockfile audits without dependency installation or lockfile changes. GitHub's 349 open default-branch alerts also include the older root/web manifests; the zero-advisory result above is scoped to this branch's root worker and `web/` packages.
- Live Instagram AI analysis; live TikTok/X retrieval and analysis. The completed YouTube path and Instagram download above do not establish universal platform coverage.
- Browser task quality across a representative evaluation set or third-party authenticated accounts.
- Production Supabase migration application, RLS/grants, and simultaneous multi-connection contention.
- Live Notion OAuth exchange or production media CDN downloads.
- Native Mac application control beyond the Terminal launch.
- Docker image build; the Docker daemon was unavailable.
- A general automatic verification service for all agent-reported outcomes. The specific generated game above received independent checks; other completed jobs remain unverified until inspected.

Provider keys were configured privately for this sprint without printing or committing them. Production configuration, migration application and deployment remain separate. The development-only `/replicate/demo` is an illustrative preview with execution disabled; `/replicate/local` operates on private local capture artifacts and a separately paired local companion.
