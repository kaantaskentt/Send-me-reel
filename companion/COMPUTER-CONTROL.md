# Local Mac control

This executor uses **Peekaboo 4.4.0**, a MIT-licensed native macOS helper, and the companion's existing OpenAI key/model. It does not start Peekaboo's agent, install OpenClaw, or use another model subscription. Requires macOS 15+ and an unlocked GUI session.

## Install and permissions

Use the [official v4.4.0 release](https://github.com/openclaw/Peekaboo/releases/tag/v4.4.0):

| Artifact | SHA256 |
| --- | --- |
| `peekaboo-macos-universal.tar.gz` | `6260d3560dc05b8df6621ffac5544ff987291105842ffeb652ecf018ec725d45` |
| `Peekaboo-4.4.0.app.zip` | `ca87deb3fd705b71e29d51c131ba53d34a3d88f6d1048878a7673e0a049b6764` |

Default CLI: `~/.local/share/contextdrop/peekaboo/4.4.0/peekaboo`. The trusted local environment can override it with `CONTEXTDROP_PEEKABOO_BINARY` (absolute path). Put the app in `~/Applications` or `/Applications`. The setup button verifies version and Developer ID team `FWJYW4S8P8` before opening the fixed helper path.

The user grants **Screen Recording and Accessibility to Peekaboo.app**, not ContextDrop's web page or this Codex session. Event Synthesizing may additionally be needed for background keyboard input. Open Peekaboo's permission checklist, choose the permissions in macOS, then Check again. ContextDrop never grants TCC permissions automatically.

The runtime pins `~/Library/Application Support/Peekaboo/bridge.sock` (`CONTEXTDROP_PEEKABOO_SOCKET` can select another absolute trusted local socket). It never falls back to another host or starts a daemon implicitly. Read-only health checks only inspect the version and permissions, with an 8-second bound; terminal health does not wait for them.

## Contract and scope

- Paired `GET /computer/setup`: structured availability, permissions and setup instructions.
- Paired `POST /computer/setup` with `{"action":"open_helper"}`: opens the verified helper. No model call or capture.
- Local web proxy: `/api/local/computer/setup` GET/POST. Refused in production and for non-loopback/cross-origin requests.
- `POST /runs` with `executor:"computer"` and a reviewed plan: supervised run.
- `/runs/:id`, `/approve`, `/resume`, `/stop`: same watch/control contract as the existing browser executor. Native actions are `open_app`, `select_window`, `click`, `type`, `press`, `scroll`, `ask_user`, `finish`.

Each app and exact window is approved before its pixels are sent to AI. Each mutation is approved separately. The helper binds commands to a fresh exact-window snapshot and process generation. Before approved input, ContextDrop re-observes and refuses changed controls; no blind mutation retries. Unknown/partial effects pause for review. Stop aborts the model and owned CLI process, leaving shared apps/Bridge open. It cannot undo an action already delivered.

Background AX actions can leave other apps focused, but this is **your real Mac, not an isolated sandbox**. Opening apps brings them forward. This first version deliberately has no raw coordinates, arbitrary shell, clipboard, file opener or security-settings automation. Shells, coding editors and password managers are excluded; code tasks use the existing Codex/Claude path. Apps without useful Accessibility controls may need manual input. This is not yet arbitrary whole-desktop autonomy.

The app preview keeps the latest screenshot in memory and removes its temporary file. Peekaboo also owns a snapshot cache (`~/.peekaboo/snapshots`); review the helper's retention separately. ContextDrop persists descriptions/status, not screenshot pixels or pending typed values. Some action descriptions can still contain task content. Private input screens detected by Accessibility are refused before model submission; this does not guarantee all sensitive content can be recognized.

## Validation

`tests/computer.test.ts` and `web/tests/local-computer.test.ts` exercise adapters/contracts with fixtures. They do not prove OS permission or live control. A live proof needs the installed signed helper, manual permission grants, and a harmless exact-window task such as Calculator 2+2. Check stop while planning, stale approval rejection, moved-window behavior, and permission-denied recovery before calling it verified.

Primary implementation references: [permissions](https://peekaboo.sh/permissions.html), [see](https://peekaboo.sh/commands/see.html), [click](https://peekaboo.sh/commands/click.html), [typing](https://peekaboo.sh/commands/type.html), [Bridge host](https://peekaboo.sh/bridge-host.html). Tagged v4.4.0 Swift sources were checked for JSON field names and exact command spelling.
