# ContextDrop on your Mac

Double-click **Open ContextDrop.command** in this folder. Leave that Terminal window open while using the app.

Open **http://127.0.0.1:3127/replicate/local**.

1. Add a link or file.
2. Ask a short question, such as “Find the repo shown here” or “Help me build my version.”
3. Choose the suggested action. Review its plan, choose Codex, Claude Code, or Browser, then approve.
4. Open **Tasks** to watch real output, stop a task, or open its workspace. Tasks keep their original source when you switch chats.

## From your iPhone

The direct personal path uses **Apple Shortcuts + iCloud Drive**. A share shortcut saves the URL into `iCloud Drive → Shortcuts → ContextDrop → Inbox`; this Mac imports it into **Phone inbox**. Use the same Apple Account on both devices and enable Shortcuts iCloud Sync. See [the one-time setup](docs/iphone-shortcut.md). A download button appears only when a personal signed shortcut exists on this Mac.

Choose a received link to put it in the input, then click **Analyze this link**. Receiving a link does not spend provider credits, run commands, or replace the current conversation. The link stays queued if analysis cannot start. The receiver checks roughly every 15 seconds after iCloud delivers the file; it catches up when the launcher restarts.

**Telegram** remains available under **Phone inbox → Setup help and Telegram**. Pair with the personal `/dashboard` link from **@contextdrop2027bot**; paste it only into the local pairing box. After pairing, paste a social link into the bot. Completed bot analyses appear in **Library** without interrupting the current conversation.

The existing Telegram bot and its database must be reachable. Its Supabase project is currently paused and cannot resume until its member's free-project quota is resolved. The direct iCloud receiver does not depend on that database. This bridge does not start a competing Telegram poller or change the production bot.

## What to expect

- Chat and source details persist locally. Answers distinguish source observations from suggestions; a closer video inspection can be reused in follow-up questions.
- Video understanding can miss details. There is no guarantee of reading every frame or recovering text that was never legible. Ask about a specific moment when precision matters.
- Public links depend on platform access. Upload a file when retrieval is blocked; direct Instagram image/carousel ingestion is not implemented in the local video reader.
- Codex runs in a fresh workspace, with live output and a 20-minute execution limit. Claude Code opens interactively in plan mode. A finished agent report still needs review.
- Browser tasks use a separate visible browser with reviewed actions. Native desktop control and watching the Mac screen from your phone are not implemented.
- Closing the task viewer leaves work running. Closing the task's Terminal window stops that terminal process. Closing the launcher disconnects the app; it does not prove an independent terminal task stopped.

## Development checks

Run `npm test`, `npm run build`, `npm run check:companion`, and `npm --prefix web run lint`. Browser regressions live in `web/e2e`. Hosted changes must also pass `npm run check:hosted`; the local routes must remain disabled in production.
