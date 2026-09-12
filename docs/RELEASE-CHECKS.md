# Release checks

Every pull request and push to `main` or `codex/**` runs two independent jobs:

- **Clean hosted build and smoke** uses Node 24, matching Vercel. It copies tracked working-tree source into an isolated temporary directory, excludes environment files/private captures/installed dependencies, installs only the web lockfile, builds Next.js and inspects deployment traces. Production smoke checks the public pages, login redirects and denial of local-only routes, including spoofed localhost/origin headers with local opt-in enabled.
- **Node 22 worker and dependency audits** matches Railway's declared Node major. It performs a clean root install, TypeScript build, native Sharp resize/decode and official npm audits for both lockfiles, including production-only dependency graphs. It does not start the bot or call providers.

Run the hosted gate from the repository root before pushing:

```sh
npm run check:hosted
```

Use Node 24 for this command. Stage new source files first: the gate copies Git-tracked files using their current contents, including uncommitted edits. Root packages and credentials cannot satisfy the isolated web build. The script has bounded install/build/server lifetimes, stops its owned processes and removes temporary files. Failure output preserves the original build error if cleanup also fails.

The gate always checks `/replicate/local`, `/replicate/demo`, `/studio/local` and GET/POST `/api/local/capture` return 404 in production. If local APIs or pages are added later, their declared methods and pages are also discovered and checked.

## Scope and remaining checks

Main currently has no unit/integration suite: its original `npm test` command is a failing placeholder. Its existing application source also has lint debt (92 errors and 14 warnings measured with the Next 16.3.5 lint configuration). These CI jobs verify build, smoke and dependency boundaries; they do not claim a passing unit suite or lint result. No lint rules or errors are suppressed by this workflow.

Before a production release, verify the actual Vercel preview and relevant authenticated flows. The Linux Node 22 job checks worker compilation and image processing, while the complete Docker image, Railway deployment and provider-backed analysis need separate validation. Dependency audits cover known advisories, not every possible security defect.

Require both jobs in branch protection where configured. Vercel's Git integration may build independently of GitHub Actions, so these checks do not themselves block or promote a deployment.
