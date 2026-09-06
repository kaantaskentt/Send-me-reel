# Verification record — 2026-09-06

Environment: macOS, Node.js 24.13.0, Next.js 16.3.4, Chromium 1243 / Playwright 1.63. Source baseline main `96f1a90`.

| Check | Result | What this proves |
|---|---|---|
| `npm test` | 66 passed | Contract, API, ownership, network, evidence, queue, billing, and controlled browser behavior |
| Embedded PostgreSQL | 8 tests included above | Actual migration SQL, rollback, duplicate submission/refund behavior, and RPC permissions |
| `npm run build` | Passed | Worker TypeScript compilation |
| `npm run check:companion` | Passed | Local companion TypeScript compilation |
| `npm --prefix web run build` | Passed | Optimized Next.js build and route generation |
| `npm run test:ui` | 2 passed | Desktop/mobile workbench and mocked-provider/companion approval UI |
| Targeted browser/security checks after highlight refinement | Passed | Actual Chromium click approval, stale-element rejection, and egress shutdown |
| `npm audit` | 0 advisories in the root worker and `web/` dependency trees | Known dependency advisories in those two trees at check time |
| Legacy production lockfile audits | `landing/`: 35 advisories; `landing-v2/`: 73 | Separate pnpm trees remain unremediated; neither is built by the current worker/web build |
| `git diff --check` | Passed | Patch whitespace consistency |

## Rendered UI

Flow: completed analysis -> choose goal -> prepare evidence-backed plan -> pair local companion -> start browser walkthrough -> inspect highlighted action in a wide session dialog -> approve -> see unverified completion -> close the controlled browser.

The UI test intercepts the remote planning and companion responses with clearly labelled fixtures. A separate companion regression uses actual Chromium and a deterministic planner against a local test page; it genuinely waits for approval, clicks, and observes the changed content. Neither test is a live AI evaluation.

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

## Terminal check

A real launcher opened a Terminal runner and started the installed, signed-in Codex CLI in a new project folder. The recorded state reached `running`. No result artifact appeared during observation. Computer Use refused access to Terminal, so the interactive state could not be inspected or advanced. The test runner was stopped. This confirms process launch, not successful AI construction.

## Not verified

- The separate legacy `landing/` and `landing-v2/` dependency trees were not remediated. Their production-only audits found 15 high/19 moderate/1 low and 17 high/48 moderate/8 low advisories respectively, with no critical advisories. These were lockfile audits without dependency installation. GitHub still reports advisories on the default branch; the zero-advisory result above is scoped to this branch's root worker and `web/` packages.
- Live Instagram, TikTok, X or YouTube analysis with paid providers.
- Browser task quality with a real model and third-party accounts.
- Production Supabase migration application, RLS/grants, and simultaneous multi-connection contention.
- Live Notion OAuth exchange or production media CDN downloads.
- Native Mac application control beyond the Terminal launch.
- Docker image build; the Docker daemon was unavailable.
- Independent verification of agent-reported outcomes.

Secrets and live database settings must be configured locally before those tests. The development-only `/replicate/demo` is an illustrative preview with execution disabled.
