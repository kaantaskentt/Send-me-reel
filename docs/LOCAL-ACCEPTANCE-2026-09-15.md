# Local acceptance audit — 2026-09-15

Status: **locally verified personal beta; not a production release**. Work was performed in `codex/contextdrop-next` in the Developer checkout. The older Desktop checkout was preserved. Start with `npm run personal` and open `http://127.0.0.1:3127/replicate/local` on the Mac. This flow requires configured providers but no Google or Supabase sign-in.

## The owner's three real links

These were actual downloads and Gemini calls, followed by real chat requests. They were not fixture responses. Times below measure the successful capture from its persisted start to completion; they exclude follow-up chat and are not latency guarantees.

| Source | Video length | Successful capture | Result and judgement |
|---|---:|---:|---|
| [Instagram: Dc7hhAUEvu1](https://www.instagram.com/reel/Dc7hhAUEvu1/) | 51.31 s | 65.14 s | Identified a five-tool roundup: Taste Skill, Impeccable, Playwright CLI, Awesome DESIGN.md and img2threejs. It offered research or a small example rather than pretending the roundup was a complete tutorial. A repo lookup retained uncertainty about the exact owner. |
| [Instagram: DdO1UioAHAS](https://www.instagram.com/reel/DdO1UioAHAS/) | 48.49 s | 48.06 s | Read the displayed Claude repo list and grouped useful tools. The latest native overview recovered many more labels than the early-image-only pass. Names are fallible visual extractions, not proof of all original owners or a fully recovered resource list. |
| [X: sairahul1/2099198172862001153](https://x.com/sairahul1/status/2099198172862001153) | 25.19 s | 28.52 s | Recognized Codex Router/DeepSeek subagent settings and a Codex project view. Correctly answered that this demonstrates configuration, not proof that DeepSeek matches Astra's performance. Suggested comparing both on the same small task. |

Capture IDs, in table order: `d5f65698-009e-4390-83ee-8d10712a38ce`, `06c9a931-2277-4a0c-98f9-37452d361b8c`, `1b59baa2-ef8f-4ca8-9a01-a49c3691a1ce`. Evidence and conversations are private files under `.contextdrop/`; source media and provider responses are not committed.

An additional fresh-conversation test asked: “I build landing pages. Pick three useful repos mentioned here, give me their GitHub links, and tell me what I could try with each. Keep it short.” The final pass took 12.15 seconds across two model calls. It returned UI UX Pro Max, Playwright MCP and Context7, clickable public candidates, and practical design/testing/docs uses. It explicitly labelled them **candidate matches, not confirmed originals**. The server performed repository checks against the original source clues. This test invoked the same answer engine directly, with empty conversation history; the earlier chat and task flows were also exercised through actual Chrome.

## Failures found and repaired

- Valid dense screen text exceeded the original 12-line parser limit. The bounded parser now accepts up to 64 lines; it still rejects malformed evidence.
- A nested output-schema constraint caused an actual Gemini 400 response. The provider schema was corrected while retaining server validation.
- Early PNGs exhausted the image budget before later parts of a Reel. Temporal slots now reserve byte allowances across the timeline; the second Reel retained 12 details spanning approximately 0–45 seconds, instead of four early images ending around 12 seconds.
- Detail images inherited low video resolution. Gemini 3 requests now use high resolution for the selected images and low resolution for the video overview. The current provider accepted this configuration in the real second-Reel capture.
- Observation positions did not reliably identify their saved image. Images now resolve through source-bound timestamp mapping and correct PNG/JPEG media types.
- The chat loop discarded useful research when its lookup budget ran out. It now reserves a final answer, explains unperformed lookups and preserves the collected evidence.
- A web search result was presented too confidently as the creator's exact repo. Suggested repository roots now receive bounded identity checks against source clues, followed by a correction pass and an uncertainty fallback. A fresh test found backtick-formatted URLs escaping this check; Markdown, inline-code, plain-text and `www` cases now have regression coverage.
- Cached suggestions promised a creator's complete count and sometimes treated a visible project title as a tool to install. The guide prompt and cache version were updated. The real UI now says “Find the repo names” and “Find the names shown in the video.”
- Duplicate startup could consume more RAM and leave competing local servers. The launcher now reuses a validated live session. One verified, unrelated idle development server consuming about 4 GB was stopped during this run; no project files were deleted.
- CLI readiness and connection availability were conflated. Native installation/authentication are checked separately from actual GitHub/Vercel tool access. Unsupported modes fail before launching.
- A CLI project-trust override accepted by superficial inspection failed during actual execution. It was corrected and tested with the real installed CLI.
- The original background sandbox blocked package access and browser tests. The fixed runner permits dependency/test-server networking and uses Codex's automatic approval review for necessary tool escalation; it does not disable the approval mechanism.

Old failures were preserved. This was not a first-attempt success. One early model observation also misdescribed a saved screen-detail image; inspecting the image directly corrected the identification. Image coverage and model accuracy remain fallible.

## Real execution and connections

The first Reel's reviewed task requested a tiny local page that could be checked with Playwright. The task was prepared and approved through the actual Chrome UI. Its first run created files but could not launch the browser in the original sandbox, so the app retained the unverified result.

After the runner fix, the same reviewed task was submitted to the paired companion again. Run `7e335bea-c1e1-4125-b7cb-befe1629ffc5` created a new project under `~/Developer/contextdrop-runs/`. It installed the required dependency, built the page, recovered from an occupied port without stopping the other server, requested browser-test permission through automatic approval review, and passed **two real browser tests in 8.7 seconds**. The complete run took about three minutes. Checks covered desktop/mobile viewports, form input, Enter submission, blank input, literal HTML-like text, overflow and browser errors. Actual screenshots, a test report and `CONTEXTDROP-RESULT.md` are present; the mobile screenshot was independently inspected.

The app's Tasks dialog showed the real result and retained the original source while the second Reel was open. Its label remains **Finished · review the result**: an agent exit code is not a general success certificate.

Separate read-only Codex probes using the actual fixed connection policy discovered and called GitHub identity and Vercel team/project tools. They returned the expected signed-in GitHub identity and one Vercel team with 19 projects. No repository write, deployment, credential copying, new authorization or publishing action was performed. Claude Code's native sign-in was verified, but its interactive Terminal handoff was not computer-use verified. Codex Apps authorization is not reused by Claude.

## Automated and browser checks

- Root test suite: **301 passing tests**, including real local HTTP companion checks, synthetic media, provider fixtures, state recovery, source identity and auth boundaries.
- Root TypeScript build, companion TypeScript check, web TypeScript check and web lint: passed.
- Content-studio browser regression suite: **8 passed**; personal-workspace suite: **4 passed**. Provider/companion responses in these suites are explicit fixtures. They cover confirmations, preserved drafts, source switching, task recovery, phone-inbox interactions, inert unverified links and desktop/tablet/phone widths. They do not prove real iPhone sync or live provider accuracy.
- Isolated hosted gate: installed only the web lockfile, built production without the root worker dependencies, inspected **73 deployment traces / 8,488 references**, and passed unauthenticated homepage/login/redirect smoke checks. **23 local route/method combinations returned 404 across three header cases**, even with local opt-in enabled. Private runtime files were excluded.
- Real Chrome verification: no-auth local entry, three suggestions, source chat, saved-source switching, reviewed task launch, streamed output and final task retrieval.

Raw logs and intermediate failure evidence are in the ignored `.contextdrop/acceptance-20260915/` and `.contextdrop/build-20260915/` directories. No captured credentials, provider payloads or videos are part of the source changes.

## Limits and next release gates

- This three-link set supports a personal test, not universal platform accuracy. TikTok and long YouTube videos were not freshly acceptance-tested in this run. Instagram/X photos and carousels still use upload fallback.
- Downloaded social videos are limited to 10 minutes and 100 MiB. Native public YouTube and uploaded audio/video support up to 60 minutes; uploads have a 200 MB limit. Platform access can fail independently of the reader.
- The local scan is capped at 45 seconds, 18,000 decoded frames and 12 selected detail images. High motion, faint text, tiny regions and brief content can be missed. Decoding every frame of a short clip does not mean understanding every frame. Semantic coverage is always partial.
- The native overview is sampled; saved frames and targeted YouTube/upload reinspection improve specific questions. Arbitrary social-video moment reinspection beyond the saved frames remains a gap.
- Repo existence and owner/name matching are separate from provenance, safety, quality and reproducibility. Candidate repos require inspection before use. The bounded final audit is an additional check, not a universal hallucination detector.
- Background Codex tasks have a 20-minute limit. The workspace sandbox can require automatic approval review for browser tests. Selected connections are task intent, not per-tool access isolation; stripping service environment variables does not prevent every filesystem read. External publishing and account changes require approval of the concrete action.
- Guided browser execution uses an isolated profile. It does not control every native Mac app or inherit the user's signed-in business Chrome profile. Native Terminal computer use was unavailable under the session's computer-use access policy; no bypass was attempted.
- Production is unchanged. Its Supabase project was paused/unavailable, and no hosted authenticated analysis or Google login was verified. The new auth code is fixture-tested, not live-account tested. The legacy account merge is not transactional, and credit-row initialization can fail without completing onboarding correctly; these remain blockers before marketing production account/billing flows as reliable.
- Some model replies remain longer than requested. Broader evaluation should cover silent design clips, barely visible URLs, contrasting sources, blocked posts and realistic multi-step builds before making commercial reliability claims.
