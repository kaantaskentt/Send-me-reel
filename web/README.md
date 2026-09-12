# ContextDrop web

The hosted Next.js app and the Mac development studio share some source contracts. They have different runtime dependencies: Vercel installs **only `web/package-lock.json`**. The root worker owns video capture, PDF inspection and native tools. Do not import those worker implementations into web routes or add their native packages to the hosted bundle.

## Local development

From the repository root, use Node.js 24:

```sh
npm ci
npm --prefix web ci
npm run local:studio
```

The local studio runs at `http://127.0.0.1:3127/replicate/local`. Local API routes additionally require `CONTEXTDROP_LOCAL_STUDIO=1` in development. Configure private credentials locally using `.env.example` and `web/.env.example`; never commit `.env` files or `.contextdrop` captures.

## Check the actual hosted boundary

Run from the repository root **before pushing**, including documentation commits that trigger Vercel:

```sh
npm run check:hosted
```

This script needs Node, npm, Git and package-registry access, but no root install or provider keys. It:

1. Copies Git-tracked files using their current working-tree contents into a fresh temporary directory outside the checkout. Stage new source files first so they are included. Existing uncommitted edits are included; local environment files, private captures and installed dependencies are excluded.
2. Runs `npm ci --include=dev` in the copied `web` directory, then `next build`. The root `node_modules` directory remains absent. This catches dependencies that appear to work locally only because the root worker installed them.
3. Checks every Next deployment trace for environment files, private captures, root dependencies and local FFmpeg/PDF packages. Next's own web `sharp` dependency remains allowed for image optimization.
4. Starts the production app on a temporary loopback port. It checks the landing and login pages, the unauthenticated dashboard redirect, and **every declared local API method plus local/demo pages**. Local endpoints must return 404 even with the local opt-in flag enabled and forged localhost, origin and forwarding headers.
5. Stops its own processes and removes its temporary tree on completion, failure or interruption. Installation, build and smoke have bounded timeouts; failure output includes the relevant command log.

The smoke test does not sign in, call model providers, send messages or change production data. It verifies the build and unauthenticated hosted boundary; successful analysis, authenticated flows, browser interaction and production infrastructure still need their own checks. A local `next dev` or build using existing root dependencies is not a substitute for this gate.

GitHub Actions runs this gate before installing root dependencies, followed by the test suite (including Chromium and a pinned yt-dlp for the offline metadata fixture), worker/companion TypeScript checks and web lint. Keep both jobs required in branch protection where configured. Vercel's Git integration can start independently of Actions; a green local/CI gate does not itself hold or approve a Vercel deployment.

## Vercel settings

- Framework: Next.js
- Root Directory: `web`
- Node.js: `24.x`
- Install command: `npm ci`
- Build command: `npm run build`
- Include source files outside the Root Directory: enabled, because pure contracts are shared with the worker

Keep server credentials in Vercel environment settings. Production always disables the local studio and rehearsal, regardless of `CONTEXTDROP_LOCAL_STUDIO`. Check the Vercel deployment result and smoke the actual preview URL after pushing; this repository gate does not assert that a remote deployment succeeded.
