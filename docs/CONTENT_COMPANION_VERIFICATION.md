# Content companion verification — 2026-09-06

## Automated checks

- 141 backend/web unit and integration tests pass.
- 3 content-studio browser tests pass: conversational entry, persisted chat, explicit task choice, selected Claude handoff, failed-request draft preservation, source-safe Markdown, and 1440/565/390px layouts.
- 3 existing replication/rehearsal browser tests pass.
- Backend and companion TypeScript checks pass; optimized Next.js build passes.
- New UI console assertions report no unexpected browser errors. A duplicate React-key issue found by this check was fixed.

The browser tests use deterministic model/companion fixtures and do not prove real native app execution.

## Real local/provider checks

- User's YouTube source: https://www.youtube.com/watch?v=QhmhUgccaS0 (measured about 517 seconds).
- Gemini native overview: 21.233 seconds elapsed; 12 validated observations; 47,345 input / 1,438 output tokens. About $0.0178 at published input/output rates, not an invoice. No separate transcript or saved JPEGs were fabricated.
- Higher-resolution inspection: only 395–425s of that source, 2 FPS/high resolution; four observations correctly identified Godly and 21st.dev. 16,887 input / 724 output tokens, about $0.0069 at the same rates.
- Real conversation: explained the source as a design showcase, found inspiration sites, searched GitHub, verified that nateherkai/scroll-craft exists, and retained the uncertainty about whether it is the exact original.
- Real approved-scope planning: generated a repository inspection plan from the chat action. Browser inspection showed the intended goal and Claude Code selection. The plan remains unexecuted.
- Public GitHub README capture: Agent-Reach, 14,982 characters.
- Public webpage capture: 21st.dev, 26,032 characters via Jina Reader, with text-only evidence labels.
- Real HTTP capture flow: submitted nateherkai/scroll-craft through /api/local/capture, received202, reached done, listed the saved source, and restored the original video through /api/local/library with200. Its conversation was preserved.
- Restarted the local companion after confirming earlier tracked runs were stopped/finished. Live health reports Codex available, Claude Code available, and browser planner configured.

Private checkpoints, provider usage, conversations and detailed reports remain under the ignored .contextdrop directory. Browser QA screenshots are under /private/tmp/contextdrop-content-qa and /private/tmp/contextdrop-replication-qa.

## Not established by these checks

- No native Claude Code window was opened/visually verified in this turn. Its fixed interactive launch arguments, secret filtering, failures and selection were exercised through subprocess/browser tests.
- No code was installed or cloned from the candidate Scroll Craft repo, and no task was executed for this new conversation.
- Hour-long native capture/resume is covered by bounded segment/HTTP fixtures; a real one-hour source has not been run.
- Instagram media retrieval was verified earlier, but this turn's new conversational workflow was live-tested with YouTube, GitHub and a website. TikTok/X coverage is not universal.
- No production deployment, live database migration, commercial billing rollout or general native desktop controller is included.
