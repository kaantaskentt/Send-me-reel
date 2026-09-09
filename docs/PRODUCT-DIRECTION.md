# From saved links to guided execution

## The product promise

Send something from the internet. Say what you want from it, or accept the tool's suggested goal. Watch it turn that example into a useful result, with you involved at the decisions that matter.

The experience should support different outcomes from the same source:

- A creator demonstrates an AI website builder: reconstruct the workflow, open the tool, help the user sign in, configure a first project, and verify a working page.
- A developer demonstrates a repository: inspect its current instructions, adapt setup to the user's machine, build locally, and show the result.
- A creator shows a visual effect: identify the technique, reference assets and missing inputs, then create an adapted output when a suitable creative tool is connected.
- A post announces an AI tool: inspect official documentation and run a small relevant experiment rather than inventing a tutorial that was never shown.

The goal is an outcome, not literal replay of screen coordinates. Menus, versions, account states, and prerequisites change.

## The core interaction

1. **Send:** paste/share a source URL and optionally say what you want to achieve.
2. **Understand:** preserve the transcript, screen evidence, timestamps, source identity and capture limitations.
3. **Propose:** show the intended result, required tools/accounts, the source steps, adaptations and final checks.
4. **Do:** use a local browser, Terminal, or a future desktop adapter to perform the work visibly.
5. **Bring the person in:** explain the next consequential action, highlight the actual target, and offer Yes / No / I'll do this part.
6. **Verify:** show artifacts and actual checks. An agent's report is evidence to review, not an independent guarantee.

The app should remember reusable workflows and the user's environment only with an explicit retention design. The current companion intentionally uses an isolated browser session and does not import an existing Chrome profile.

## Implemented on this branch

- Structured source-linked plans, with observed vs inferred steps and reviewable success criteria.
- A Mac companion with session pairing, a visible Chromium walkthrough, highlighted click/fill targets, contextual approvals, manual login handoff, downloads, stop and action history.
- A Codex Terminal executor with a fresh project directory and a portable plan packet.
- Improved sampled frame evidence and explicit capture gaps.

This is an execution foundation. It does not yet include general native Mac desktop control, seamless account reuse, a signed one-click installer, a browser extension, or independently verified autonomous results.

## What should come next

### 1. Prove the complete job on real examples

Run 20–30 representative owned/public examples: short AI tool demos, web build tutorials, no-code workflows, missing setup, outdated instructions, unreadable text, inaccessible posts, and malicious embedded instructions. Have a human annotate critical steps and success criteria. Track retrieval success by platform, missed prerequisites, fabricated steps, task completion, interventions, duration and cost.

Do not call one scraper or model “best” without these measurements. Choose adapters by observed task success and recovery behavior.

### 2. Improve temporal understanding

The current pipeline uses Whisper text plus up to 96 sampled high-resolution frames. Native video models can be evaluated as an additional provider, especially direct public YouTube input and targeted high-frame-rate reinspection of difficult sequences. Preserve timestamped audio segments, on-screen code, and content identity. Add user-supplied video upload as a recovery path.

Google's official documentation describes video/audio understanding, timestamps and direct YouTube input, while noting sampling behavior that can miss fast changes: [Gemini video understanding](https://ai.google.dev/gemini-api/docs/video-understanding). This is a proposed provider evaluation, not an integration shipped here.

### 3. Make local control feel native

Package and sign the companion. Provide capability-based onboarding for browser control, Screen Recording, Accessibility and local workspaces. Add a native Mac adapter with explicit selected-app/window scope and an on-screen approval overlay. Use a persistent agent session for repair, interruption and continuation rather than a new independent model decision on every browser step.

For deeper Codex integration, evaluate [Codex App Server](https://openai.com/index/unlocking-the-codex-harness/) for persistent sessions and progress/approval streams. The current Terminal launcher uses the installed CLI.

### 4. Replace “finished” with demonstrable outcomes

Website jobs need a working build, browser interaction checks and output links. SaaS workflows need a current record/page readback. Creative jobs need the actual exported asset. Expand checks per task type and surface partial success or unresolved requirements. Keep a replayable record of evidence, user decisions, modifications and checks.

## Honest retrieval boundaries

Private, deleted, geo-restricted or challenged content may not be retrievable. Authentication does not imply permission to bypass access controls. Maintain provider adapters and offer an upload/manual-source fallback. yt-dlp explicitly says site listings are not a guarantee that a particular URL works: [supported sites](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md).
