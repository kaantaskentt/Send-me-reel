# ContextDrop engineering checks

## Runtime boundary

- Vercel installs only `web/package-lock.json`, using Node 24. The root package is the local media worker and Mac companion runtime.
- Web routes may share pure contracts and portable readers. Native media inspection must cross the development-only JSON subprocess boundary; do not import `src/services/uploadedContent.ts` into the web app.
- Keep `.env*`, `.contextdrop` captures, credentials and local worker dependencies out of deployment traces. Production must refuse every local studio API and page even when its local opt-in flag is set.

## Before pushing

- Stage new source files, then run `npm run check:hosted`. It checks current tracked working-tree contents with a clean web-only install, production build, deployment traces and HTTP smoke tests. Run it even for documentation-only pushes, which also trigger Vercel.
- For code changes, run `npm test`, `npm run build`, `npm run check:companion` and `npm --prefix web run lint`. Add focused regression coverage for a reproduced defect; do not disable checks to make a failure disappear.
- Exercise changed user flows in a browser. Distinguish mocked provider/companion tests from real connected execution. Never use private captures or live account mutations as unattended CI fixtures.
- Read `web/AGENTS.md` and the installed Next.js documentation before changing framework code. Preserve unrelated working-tree edits and local user data.

## After pushing

- Check Vercel and GitHub Actions for the exact pushed commit. A successful local build or Git push does not prove a deployment succeeded.
- Smoke the actual preview URL and inspect relevant build/runtime errors. Fix a failed check before calling the repair complete.
- Report whether the result is locally verified, preview-deployed or production-deployed. Do not promote the feature branch to production as a side effect of repairing a preview.
- Keep claims bounded by evidence: build and public-page checks do not prove authenticated analysis, every social platform or computer execution works.
