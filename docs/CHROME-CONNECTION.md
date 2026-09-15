# Use your signed-in Chrome

ContextDrop's local companion now connects to the Chrome profile you explicitly
select. It does not silently open a new Chromium window when that connection is
missing. Public repo and website research belongs in chat and should not need a
Google search tab or a browser task.

## Setup

1. Start the local companion and select **Connect Chrome** in the app.
2. Open its connection page in your usual Chrome profile and click **Connect this Chrome**.
3. In Chrome 144 or newer, open `chrome://inspect/#remote-debugging` yourself and enable Remote Debugging. When Chrome asks whether to allow the connection, choose Allow.
4. Keep the connection page open. Start the browser task in ContextDrop.

Chrome's setting and connection permission belong to the user. ContextDrop does
not enable them, restart Chrome, copy a profile, or read cookies. A site may still
require sign-in or a CAPTCHA; those are handed to the user.

## Local API

`POST /browser/connect` on the companion requires the existing pairing bearer
token and allowed app origin. It returns `{ setupUrl, status }`. Do not log that
URL: it contains a random, session-only browser selection nonce, distinct from
the companion API token. The page accepts selection only from its own origin.
Unconfirmed links expire after 15 minutes. Restarting the companion clears the
selection.

`GET /health` includes `capabilities.browser.mode: "existing-chrome"` and a
connection selection status: `not_connected`, `awaiting_selection`, or
`selected`. **Selected does not mean connected.** The actual connection and tab
match are checked when a task starts. An absent, duplicated, or wrong-profile
marker fails closed. A selected profile is not a guarantee that any particular
website account is signed in.

## Scope and limits

The connector uses Chrome's documented `DevToolsActivePort` metadata and
Playwright `connectOverCDP` with `noDefaults: true`. It locates only the exact
selected local tab URL; it does not read other tabs' contents. The runner creates
its own task tab and can follow popups opened from that task. Existing tabs,
including the selection tab, are never adopted or closed. Approval remains tied
to the observed page and original DOM node; changing either invalidates it.

Stopping closes task tabs and disconnects, leaving Chrome and other tabs alive.
Finishing disconnects and leaves the result tab visible. Downloads use Chrome's
normal settings and are reported as handed to Chrome, not falsely marked saved.

This connected mode uses the user's normal Chrome session and network. It is
not an isolated browser sandbox. Task requests are checked for public URLs, but
existing profile extensions, service workers, network settings, and DNS remain
under Chrome's control. The separate isolated fixture runner retains its egress
proxy; test success there is not a claim about a real authenticated account.

## Verification

`tests/chrome-connector.test.ts` exercises bounded endpoint parsing, explicit
selection expiry, wrong-profile refusal, task tab ownership, and a real isolated
CDP fixture proving that stale DOM targets are rejected and stopping leaves user
tabs/browser alive. No live account mutation is part of that fixture.

Sources: [Chrome's connection setup](https://developer.chrome.com/docs/devtools/agents/get-started/configuration#connect-to-an-existing-browser-session),
[Playwright's CDP connection options](https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp).
