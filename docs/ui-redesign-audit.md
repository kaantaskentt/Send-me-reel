# Personal workspace UX audit

Audited the actual local app on 14 September 2026 using the saved Instagram reel, not a prepared demo. Before screenshots: `.contextdrop/qa/ui-redesign/01-before.png`, `02-link-form-before.png`, `03-connection-before.png` (private, not committed).

## Findings and changes

1. **The first task was hidden.** Pasting required opening a form with tabs and reader settings. The link field is now always visible. Upload is a single adjacent button; optional settings appear only after a link is entered.
2. **The app started with a wall of text.** Three columns squeezed a long chat beside a permanent source panel. The new single-column page presents three source-specific outcomes. The library, earlier messages and source evidence are available on demand.
3. **Actions and suggested questions repeated each other.** Action cards now lead either to chat or a concrete task review. A verified-page button opens a short confirmation. There is one execution button, “Yes, start”. No task starts on source load or choice generation.
4. **Language exposed machinery.** Guide, chat and plan prompts now request short everyday English. Technical setup lives under details. Older answers and source uncertainty remain accessible; history is preserved.
5. **The controls were small and inconsistent.** Common controls now use readable 14–16 px text, larger targets, one blue focus treatment and consistent corner radii. Mobile choices become three full-width rows.
6. **“Mac ready” overstated what was checked.** The header now says “Mac connected” only after the worker responds. The setup panel distinguishes configured readers, browser and coding capabilities; it does not claim access to every native app.
7. **Background coding still relied on opening Terminal.** A real test remained on Starting without a runner process. Codex exec mode now starts the trusted runner directly, waits for its status handshake, streams output, and survives companion restart. Interactive sessions still use Terminal. A launch with no runner status expires and cancels any late Terminal window.
8. **Finished tasks opened on technical output.** They now open on a readable result paragraph, with the full report and checks collapsed below it. Future task reports are instructed to start with a short explanation of what was made and how to open it.

## Flow acceptance

- Paste a link without opening a panel; upload still accepts supported formats and rejects invalid files before reading.
- Generate exactly three validated choices once per guide version/source; reuse the saved guide on reopen. Do not replace previous chat messages.
- Ask a question; retain drafts across reload and failed requests, including text typed while a reply is arriving.
- Open a verified destination only after its confirmation. Never make guessed Markdown links or images active.
- Prepare a task without executing it; disclose the destination/app and retain complete steps and prerequisites in the review.
- Confirm, see actual task progress, stop the task, and reopen saved results.
- Check keyboard focus, nested evidence dialogs, library search, project preferences, workflows, phone widths and console errors.

## Current capability boundaries

The app has its own local browser worker and coding runner. Codex's Computer plugin does not automatically become an app API. In this session the plugin permitted browser use and a Finder accessibility read, but refused Terminal access for safety reasons. That refusal was not bypassed or reported as a macOS permission toggle.

A real read-only browser run opened the public img2threejs showcase repository and returned its visible title/description. The app retained its honest `finished_unverified` status; the visible page was separately inspected during QA. Capture still uses sampled evidence and can miss brief text. iPhone Shortcut installation and delivery from the user's phone remain separately unverified.

A real Codex task was confirmed through the new UI, streamed activity in the app, and created a standalone checklist from a saved X clip. The generated HTML was independently opened in the in-app browser: mouse click, keyboard toggle, counter updates and reload reset passed, with no console errors. The result report records which details came from captured observations. This is proof of that local task, not universal desktop control or perfect video understanding.
