# Public lookup and local task repair

## Reproduced problem

For the Instagram Reel `DdRxjWhlrNC`, asking “give me the repo link” returned a
missing-URL explanation and a separate browser search task. That task opened a
fresh Chromium session and stopped at Google's verification challenge. The
caption already supplied the fuller name “Claudex Loop” and its distinctive
writer/reviewer workflow. Public lookup tools existed but were optional, and
the agent treated missing visual evidence as a reason to hand the search back
to the user.

## Implemented behavior

- Direct repo/link requests perform a public lookup in chat. GitHub search reads
  the two leading READMEs concurrently and compares their identities with the
  original source. A candidate can be useful without proving the video's owner.
- A failed or empty GitHub lookup requires a public web-search fallback. The
  agent can read a returned public page through the same bounded reader used
  by the capture CLI. Public research does not launch a browser task.
- Duplicate reads within a turn are reused. Search metadata and README contents
  remain external evidence and cannot become original video observations.
- Task output now shows elapsed time, event-derived progress and the agent's
  result automatically. Logs and detailed checks are collapsed. Completion
  still depends on actual runner state, not a passing-test line or an early report.
- Codex's existing automatic approval review is clearly labeled Auto only when
  the companion reports background execution. Interactive Codex and Claude Code
  retain their actual Terminal permission flow. No unrestricted bypass flag was
  added. The runner asks for proportional work and avoids repeating passing checks.
- Browser tasks require the explicitly selected existing Chrome profile. There
  is no silent fresh-browser fallback. See [Chrome setup](CHROME-CONNECTION.md).

## Live evidence

The actual app conversation returned `https://github.com/chaseai-yt/claudex-loop`
after reading two public READMEs, with a source-match qualification. No Google
page or execution task was needed.

Using the same captured source with fresh conversation context:

| Test | Elapsed | AI calls | Outcome |
| --- | ---: | ---: | --- |
| Real GitHub search and README reads | 4.65 s | 2 | Matching candidate link |
| Simulated GitHub unavailability, real web search | 10.27 s | 3 | Same candidate link |

These are individual live samples, not latency guarantees. The fallback failure
was injected; its subsequent model and web-search calls were real. Private test
output remains under `.contextdrop/acceptance/` and is not committed.

The user's actual demo task had finished in 166 seconds. Its simplified result
panel was inspected in Kaan Business Chrome. The raw log view had made the final
report-writing phase look like a stalled task.

## Checks

- 322 automated tests passed. Focused chat and Chrome proxy checks were rerun
  after the final type and copy corrections.
- Five personal-workspace browser tests, eight content-conversation browser
  tests, and the Chrome setup browser test passed. These use fixture providers
  and do not establish authenticated Chrome control.
- Root build, companion typecheck and web lint passed.
- The clean web-only production build passed. Its 74 deployment traces were
  checked for local data and worker dependencies, and all 24 local route/method
  combinations stayed unavailable under three hosted-header variants.

## Boundaries

Chrome pairing and task ownership are covered by isolated CDP and browser
fixtures. The personal Chrome connection still requires Chrome's own Remote
Debugging permission and an actual connected task before it can be called live
verified. A signed-in profile does not guarantee that websites will never ask
for CAPTCHA or login. This repair does not change production authentication or
claim deployment to contextdrop.ai.
