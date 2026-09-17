# ContextDrop design QA — 17 September 2026

## Decision and scope

Keep the supplied black/orange landing hero, including “Your feed finally useful.” The chosen dashboard reference drives the source-left, conversation-right layout. This change is local and has not been pushed or deployed.

## Visual comparison

The supplied dashboard reference and the rendered 1486×1058 implementation were inspected together. Additional inspection used a real Chrome window and a 390×844 mobile viewport.

| Area | Result |
| --- | --- |
| Layout | Source stays beside the conversation on desktop; compact source and reachable composer on mobile. Three compact action rows replace large cards. |
| Typography | Short headings, restrained weights, readable line lengths, distinct secondary text. Long URLs, code and tables stay within their column. |
| Color | Black canvas, subtle borders, orange actions. White button text uses a darker orange for contrast. |
| Source imagery | Real captured frames use contain, with a visible capture timestamp. No fabricated playback controls or fake repository match. |
| Conversation | Recent messages remain visible; older messages and evidence are disclosures. New replies scroll above the mobile composer without clearing drafts. |
| Tasks | Current status and result come first; logs and detailed report are collapsed. Open files and Stop stay explicit. |
| Computer view | Latest screenshot beside the proposed action; clear Yes, do this / Decline controls, Stop and working fullscreen. Rehearsal is labeled as recorded, with no live action. |
| Setup | Browser, coding and native app access are separate. Missing native permissions never shows Ready. |

Local QA images: `/private/tmp/contextdrop-content-qa/dark-dashboard-desktop.png`, `/private/tmp/contextdrop-content-qa/dark-dashboard-mobile-reply-viewport.png`, and `/private/tmp/contextdrop-replication-qa/rehearsal-desktop-start.png`. Fixture screenshots combine a real saved frame with mocked chat; they are UI evidence, not proof of live AI execution. These private/local artifacts are not deployment assets.

## Fixes from the review

- Phone-shared links now open and focus Add another link instead of landing inside a closed panel.
- Mobile replies and their result buttons scroll into view; initial saved history does not force a jump.
- Scoped document background removes the white strip during mobile scrolling; navigation home restores the normal landing canvas.
- Invalid saved action URLs cannot crash the result card.
- Fullscreen targets the document; a modal dialog cannot itself enter fullscreen reliably.
- The Mac helper signature check uses the actual codesign requirement syntax, verified against the installed signed app.

## Verification

- 349 automated unit/integration tests passed; no skips or failures.
- Root build, companion TypeScript, web TypeScript and web ESLint passed.
- Clean hosted build passed: 75 deployment traces / 8,685 references inspected; homepage, login and auth redirects passed; 26 local route/method combinations returned 404 under three header cases even with local opt-in enabled. This is a local release check, not a deployment.
- 10 content browser cases, 13 task/setup browser cases and 3 replication/rehearsal cases passed across focused runs. Provider and action responses were mocked.
- Real Chrome: saved Instagram source and real saved conversation render in the new dashboard.
- Real local health: Gemini and chat configured, Codex/Claude available, worker connected. Chrome still needs selection in the setup panel after restart.
- Signed/notarized Peekaboo 4.4.0 installed; the real Bridge permission response is parsed correctly as needs_permissions. Screen Recording and Accessibility were not granted by the agent.

## Remaining product boundaries

Native Mac execution is built but a live end-to-end control task is still blocked by user permission grants. This version targets Accessibility controls and reviews each action. Pixel-only interfaces and unrestricted desktop autonomy are not supported. Coding continues through Codex/Claude. Task results expose verified local file locations; an automatic playable demo URL is not invented when the runner has not provided one. The video source panel shows captured evidence, not a retained full-video player.

Visual QA: no open P0/P1/P2 issues in the reviewed desktop/mobile flow. Release status: local only; native live execution remains unverified.
