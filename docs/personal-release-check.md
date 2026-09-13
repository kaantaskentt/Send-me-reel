# Personal workspace verification — 14 September 2026

This is the local Mac workspace on `codex/contextdrop-next`. It does not imply that the production website has been deployed with these changes.

## Implemented

- A supervised personal launcher starts the app, authenticated loopback companion, optional phone inbox worker, and an owned keep-awake assertion.
- A compact library/chat/source layout with short default answers, expandable detail, explicit source observations, and reviewed task preparation.
- Durable task discovery, original-source identity, real terminal output, unverified result reports, stop requests, and workspace reveal.
- Telegram pairing through the existing signed personal dashboard link. Imports are account-scoped, bounded, deduplicated, private, and cannot replace the active source or conversation.
- An independent iCloud share inbox imports only URL data from a dedicated Shortcuts folder. Durable deduplication and dismissal survive restart; originals remain in iCloud. No provider request, active-source change, or computer task starts on receipt.
- Focused video inspections persist as real tool evidence. Screenshot lookup uses timestamps rather than indexes left over after failed vision batches.

## Visual review

The blue conversation and dark workroom concepts were compared with the actual browser render using image inspection. The user's newer request for less text and a working personal flow takes precedence over illustrative concept copy.

| Point | Concept and actual implementation | Decision |
| --- | --- | --- |
| Layout | Library left, conversation center, source context right | Preserved; collapses to a compact source header on mobile. |
| Palette | White and pale blue chat; charcoal workroom | Preserved. The primary suggested action has a white label on blue. |
| Typography | Clear hierarchy with quiet secondary labels | Compact UI labels and readable reply text; monospaced actual terminal output. |
| Density | Short answer and one next action | New replies request concise answers. Saved long replies and full task plans expand on demand. |
| Source assets | Concept uses an illustrative repository screenshot | Actual source observations are shown; no invented screenshot is used when native video capture produced no JPEG. |
| Task view | Concept shows a full-page browser simulation | Actual terminal tasks use a dark modal with source identity, Activity, Result, Open workspace, and Stop. Browser tasks retain their live browser view. |
| Scroll and mobile | Composer remains reachable | Reply scrolling stays within the conversation. Desktop chat fits the viewport; mobile checks exercise overflow and task controls. |

## Evidence and limits

The real saved YouTube source `o3IEkKXXXvo` was used for a chat-to-plan-to-Codex build of a self-contained editing checklist. The first launch exposed an obsolete standalone CLI. ContextDrop now selects the newer installed app-bundled CLI through validated private configuration; it does not change global authentication or silently substitute the model.

The resulting `index.html` and `CONTEXTDROP-RESULT.md` exist in the task workspace. Provider execution and local logic tests are real. Independent Playwright verification of the untouched `file://` artifact passed: five labelled controls, mouse and keyboard Space, progress, reload persistence, reset, a built-in verification that preserves existing progress, 390px overflow check, zero network requests and zero page errors. A report remains marked for review; it is not automatically treated as proof that every requested outcome succeeded.

The user's Instagram Reel `Dc7hhAUEvu1` also completed real capture and two real chat requests. It contained 51.308 seconds of video, 26 timestamped visual observations and transcribed speech. Chat identified five design tools, corrected the spoken `Image23js` using the visible `img2threejs` name, and searched for a matching public GitHub repository. The response explicitly distinguishes a matching public candidate from an owner that was not visible in the reel. No repository was installed, starred or cloned as part of this test.

Read-only browser verification of this actual Instagram conversation passed: the exact source and four saved messages survive reload, the repository action targets the allowed candidate, the 0:42 evidence control is visible, and the phone installer is offered. Desktop and 390px mobile layouts had no overflow or page errors. This check invoked no new capture, provider, download or computer action. The settled desktop workspace and mobile phone-inbox screenshots were also visually reviewed.

This test exposed and fixed two retrieval defects: missing advertised duration incorrectly rejected a valid Reel, and a height-only format filter excluded portrait video. The worker now measures downloaded media before extraction/model calls and uses yt-dlp's orientation-aware resolution preference. Offline process tests cover missing/incorrect duration, actual over-limit media and invalid files; actual yt-dlp format tests cover portrait, landscape, unknown dimensions, merged audio and silent video. The existing download size and duration limits remain enforced. This capture sampled frames every two seconds; it does not establish exhaustive frame coverage.

The final merged file must also fit the 100 MiB analysis limit before probing or model calls; an oversized result fails without repeating the download or attempting CDN fallback. This is an analysis acceptance limit, not a guarantee that the network transfer cannot temporarily exceed it.

Telegram integration tests use fixtures and prove account isolation, signature validation, bounded imports, and preserving the current conversation. Live phone delivery still requires account pairing and an available existing Telegram/database pipeline. At the time of this check the ContextDrop Supabase project was paused; its signed-in recovery UI reported the account member's two-free-project limit. No other project was paused and no paid plan was purchased.

The personal iPhone Shortcut was generated, statically checked and locally signed using Apple's Shortcuts CLI. Its private installer is available in Phone inbox. The receiver and mobile interaction were exercised with fixtures, including durable deduplication, URL normalization, explicit analysis, retained pending links after rejected capture, source/draft preservation and narrow-screen layout. Installation, permissions and delivery from a real iPhone remain unverified; signing is not a substitute for that check.

The final full test suite passed **229/229**, with no failures, cancellations or skips, in 51.3 seconds. The worker build, companion TypeScript check and web ESLint also passed. Serial test-file execution avoids competing native workers on this Mac without weakening assertions or extending timeouts. Browser fixtures cover task recovery, mobile stopping, phone pairing/import, draft preservation, and idempotent retry/token rotation. These fixture checks are kept separate from real model execution. The clean hosted build is checked separately before release; passing local checks does not establish deployment.

One controlled launcher shutdown returned a process-group signaling warning. Both ports were freed, session metadata cleared, and no owned service remained. The original OS error was not retained, so its cause is unconfirmed; future warnings now include the owned service name and sanitized OS error code. Signal behavior is unchanged.

Universal social-link retrieval, exhaustive every-frame understanding, native desktop control, and live phone screen streaming are not claimed.
