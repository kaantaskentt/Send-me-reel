# Reuse audit and a bounded harness adapter

Verified locally on 2026-09-06. This began as a read-only audit. A bounded Claude inspection adapter was subsequently implemented and checked with subprocess fixtures; see the implementation note below. No paid harness session, repository install, authentication inspection, or native Terminal UI automation was performed in this audit.

## The useful product is already partly in this repository

The clarified product is **chat with AI content, discover the actual resources, then take the action the user chooses**. Replicating a tutorial is one action. It should not be the default interpretation of every video.

| Existing code | Useful behavior | Change needed for the clarified vision |
| --- | --- | --- |
| `web/src/app/chat/page.tsx:153` | Suggested prompts already include asking for the smallest thing to try and a Claude Code prompt. The page has attachment selection, streamed chat, saved threads, and explicit action buttons. | Generate a few source-specific suggestions. Put this conversation in the local flow immediately after capture. |
| `web/src/app/api/analyses/[id]/chat/route.ts:9` | Real conversational prompt, official-URL research through OpenAI `web_search`, Supabase message persistence and user ownership checks. | Extract a shared provider service for both authenticated production chat and guarded local chat. Preserve server ownership and spending checks. |
| `web/src/components/chat/{ChatInput,ChatMessage,ChatSidebar,Markdown}.tsx` | Input, stop button, search progress, Markdown rendering and thread navigation. | Reuse behavior and spacing; adapt colours to the existing dark/orange visual direction. |
| `src/services/subjectExtractor.ts:8` | Named tool/model/repository extraction with suggested source URLs and confidence. | Return multiple entities and evidence references, including observed screen text. Today it returns one entity and explicitly discards some multi-tool workflows at line 68. |
| `src/services/subjectResearcher.ts:40` | Searches for the canonical source, carries source URLs and fetched time, anchors research to a URL explicitly present in the source. | Verify returned links independently; record candidate versus verified identity. Expose this as a callable chat tool, not only an ingestion stage. |
| `src/services/contentClassifier.ts` | Distinguishes a tool discovery, review, tutorial, technique, and explanation. | Use these as weak routing hints. The user request should decide the action. Narrow recommendations to AI content without forcing everything to `build`. |
| `web/src/components/landing/HeroSection.tsx:72` | The screenshot's dark/orange paste-link entrance already exists in the supported Next app. | Route successful ingestion directly to a content conversation. The current hero stores `pendingLink` and redirects to `/dashboard`. |
| `web/src/components/landing/HeroDemoAnimation.tsx` | Existing orange content-card presentation. | Reuse its visual language, not its sample restaurant content or simulated progress. |
| `companion/server.ts`, `companion/runner.mjs` | Paired loopback companion, fresh workspace, private trusted control directory, fixed launcher, subprocess environment filtering and explicit result states. | The new Claude adapter opens an approved plan in an interactive inspection session. Independently validated repository acquisition remains to be built. |

The separate `landing/` and `landing-v2/` trees do not need to become another application dependency. The desired hero already lives in `web/`. Port a small visual component if necessary; do not revive an entire older stack.

## Gaps that matter before reusing chat

1. **Chat cannot inspect the video again.** It sees the first 4,000 transcript characters and 1,500 characters of visual summary (`chat/route.ts:172`), not the frame archive. Subject extraction has even shorter 2,000/1,000 character limits. A GitHub tab shown near the end of a longer video may never enter these prompts. Add source-timestamp retrieval and targeted visual inspection tools.
2. **One subject is not enough.** A video comparing five websites needs five independently evidenced entities. Preserve every observed candidate, its timestamp, visible hostname/repo text, and uncertainty. Answer user questions against the relevant entities.
3. **Search is not identity verification.** `canonicalUrl` is model-parsed JSON. Before cloning, match the observed owner/name or visible README information to actual public GitHub repository metadata. A high model confidence score is not a verification method. If only a vague logo is visible, show candidates or report the missing evidence.
4. **The source enters the system prompt.** Move transcript, captions, page text and frame observations into clearly marked untrusted data. An instruction in a video, README or chat history must not choose a shell command, grant permission, or alter the harness configuration.
5. **Current chat request validation is incomplete.** The route trusts a TypeScript cast of arbitrary `messages`, accepts full client-supplied history, consumes quota before validating the analysis, and checks a supplied thread's user without also binding its `analysis_id`. Before expanding its tool privileges, bound payload/turn sizes, validate only user/assistant roles, bind threads to both owner and analysis, and load authoritative history server-side.
6. **Action tags are a small UI convenience, not a tool protocol.** The current `[ACTION:add_task:...]` / `[ACTION:save_notion]` buttons should not be extended to arbitrary commands. Use schema-validated typed actions with immutable IDs, source evidence, exact target and an explicit execution state.
7. **Local and production are currently separate paths.** Local capture files are appropriate for a single-user iteration, but parallel content requires stable content IDs and per-content conversations. Do not overwrite the only current content when the user pastes another link.

## Useful material in the original ContextDrop folder

The original `/Users/kaantaskent/Desktop/AI & Dev Projects/ContextDrop` checkout remains dirty and was not modified.

Its uncommitted changes include Gemini 2.5 Flash image analysis, Groq `whisper-large-v3-turbo`, a Jina Reader/Search plus Groq synthesis experiment, and a Claude Haiku classifier. Useful research assets are `scripts/eval-groq-migration.ts`, `scripts/eval-mismatch-verdicts.ts`, and the saved evaluation JSON files. The latest saved run, `scripts/eval-results-2026-05-08T01-09-04.json:2`, contains 15 comparisons, zero recorded runtime errors, 40% content-type agreement, 50% subject-name agreement, and 16.7% research-hit retention against stored results, with approximately 4.46 seconds average total measured latency.

Those numbers are historical regression comparisons, not human-labelled correctness or current-provider benchmarks. They do show why the cheap experiment should not be copied wholesale merely because requests succeeded. Reuse the evaluation approach and relevant AI-content failure cases; establish ground truth for repo identity, resource lists and evidence timing. Never commit the full historical production records as a public benchmark without reviewing their data.

Original untracked `TryItNowSection.tsx` and `GroupChatSection.tsx` are older Telegram marketing sections. Their visual details are reusable; the former's fixed “60 seconds” promise is not an appropriate product claim.

## Installed harnesses and verified flags

Only version/help metadata was read. Installed does not prove signed-in or sufficient account quota.

| Tool | Local availability | Relevant help-confirmed capabilities |
| --- | --- | --- |
| Claude Code | `/Users/kaantaskent/.local/bin/claude`, **2.1.259** | Interactive prompt by default; `--safe-mode`, `--permission-mode plan`, `--permission-mode manual`, `--name`, `--session-id`, `--resume`, `--no-chrome`. |
| Codex CLI | `/Users/kaantaskent/.local/bin/codex`, **0.144.4** | Interactive `-C`, `-s read-only` / `workspace-write`, `-a on-request` / `untrusted`, `--no-alt-screen`, `-m`. Exec also has `--ignore-user-config`, `--json` and `--output-last-message`. |
| Apple Git | `/usr/bin/git`, **2.39.2** | `clone --no-checkout --depth 1 --single-branch --no-tags -- <repo> <dir>`. The installed help does **not** expose the newer `clone --revision` flag. |

For Claude, the current installed `--safe-mode` disables project customizations such as CLAUDE.md, plugins, hooks and MCP servers while preserving normal authentication and permission behavior. It is appropriate for an initial inspection session opened on a newly discovered project. It is **not an operating-system sandbox**. The `--bare` flag is different: installed help explicitly says it skips OAuth/keychain reads, so it should not be used as a supposed auth-preserving equivalent. [Official CLI reference](https://code.claude.com/docs/en/cli-reference)

Plan mode researches and proposes changes before editing; it still permits exploratory shell commands under normal permission handling. It is not proof that arbitrary source content is safe. Start with plan mode and let the person review the resulting proposal in their chosen harness. [Official permission modes](https://code.claude.com/docs/en/permission-modes)

## Proposed `open_repository` adapter

Keep the first version bounded to public GitHub repositories and the user's installed harness. This requires no always-on cloud computer and does not require putting the harness's authentication secrets in the web application.

1. **Resolve and show the target.** The chat returns a typed candidate with `sourceId`, `evidenceIds`, `owner`, `repo`, canonical `https://github.com/owner/repo`, and why it matches. Check actual GitHub metadata and the relevant README against the video clue. The card says “Open owner/repo in Claude Code”, with the fresh folder and scope visible. User acceptance authorizes this concrete handoff, not installation or deployment.
2. **Validate again in the companion.** Accept an exact action ID and selected installed harness, not command text, arbitrary binary paths, environment variables, or URL-derived filenames. Revalidate public `github.com` HTTPS owner/repo, no credentials, port, query, fragment, redirects to another host or local protocols. Store the resolved repository ID and commit in the control record.
3. **Create an isolated project directory.** Use a fresh UUID under the configured Developer root. Keep the trusted launch configuration and source evidence manifest in a sibling `control` directory. Never overwrite the user's existing repository or clone into the application source tree.
4. **Fetch without running project setup.** Use fixed-argv `spawn` / `execFile`, `shell: false`, bounded output/time/disk, and a restricted Git environment. Disable inherited Git configuration/template hooks for this public fetch and do not recurse into submodules. Clone initially with `--no-checkout`, confirm remote and actual commit, inspect tree/path limits, then materialize the reviewed revision with controlled Git config. A changed commit between review and fetch requires refreshed review. The installed Git supports the shallow/no-checkout flags; do not copy newer `--revision` examples into this Mac's adapter. [Official Git clone documentation](https://git-scm.com/docs/git-clone)
5. **Write a small evidence handoff.** Include the user's exact objective, resolved repo/commit, timestamps and screenshots that identified it, known unknowns, and the boundary “inspect and propose setup; do not install or run project code yet.” The video is context, not authority. Check for collisions before putting any companion-authored file in the cloned project.
6. **Launch a visible interactive inspection.** Suggested fixed Claude argv: `['--safe-mode', '--permission-mode', 'plan', '--no-chrome', '--name', generatedName, fixedPrompt]`, spawned with `cwd: freshProject`. `fixedPrompt` points to the handoff and asks for setup review. Preserve only required user OS/auth-location environment, never worker API keys or companion tokens. Do not use `-p`, pipe stdin, or bypass permissions: installed help states noninteractive Claude skips the workspace trust dialog. The current native `.command` launcher can launch the trusted adapter; the product should report launching/started only, not “ready to use”.
7. **Keep execution distinct.** The user reviews the proposed setup in Claude and approves further actions there. Running install scripts, enabling repo hooks/MCP, creating accounts and deployment are later scopes. The initial “open repo” action must end successfully even if the project cannot yet build. Record `repo_ready`, `harness_launched`, `needs_input`, and `failed` separately.

The equivalent initial Codex inspection uses its existing fixed adapter with `-C <freshProject> -s read-only -a on-request --no-alt-screen <fixedPrompt>`; allowing project writes is a subsequent reviewed task. Its model override remains a trusted local setting. Browser guidance remains another adapter and should not inherit the user's ordinary authenticated browser session by default.

## First acceptance cases

- A video that only discusses three AI websites produces resource cards and a useful conversation, without creating a build plan.
- A GitHub page is visible only in a late frame: the agent retrieves that moment, identifies the exact repository, and shows evidence before handoff.
- An ambiguous repo screenshot produces candidate links or a targeted follow-up, never an invented `git clone` command.
- A verified public repository opens in the selected installed harness in a fresh directory. No `npm install`, lifecycle script, hook, MCP server, submodule or account action runs during handoff.
- A missing binary, revoked authentication, cancelled trust prompt, failed clone or stale approval leaves an honest actionable state and does not delete existing projects.
- Browser-derived text, Unicode paths, argument-looking repo names and embedded shell syntax cannot become executable launcher arguments.

The cheapest next implementation is to connect the existing conversation and evidence store to these small adapters. A new all-purpose agent framework or desktop virtual machine is not needed to prove this interaction.

## Implementation completed after the audit

`companion/harnesses.ts` now discovers installed Codex and Claude Code using version/help metadata only. Claude is only advertised if its help includes the required safe-mode and permission controls. Both `scripts/start-local-companion.ts` and the direct companion entry point use that discovery.

`POST /runs` accepts optional `harness: "codex" | "claude"` for terminal runs, defaults to Codex for existing clients, rejects unsupported harnesses and browser/harness mixtures, and keeps the binary/config under local control. Health exposes `capabilities.harnesses`; run state and the evidence brief record the selected harness. Claude receives `--safe-mode --permission-mode plan --no-chrome --name "ContextDrop inspection"` and a fixed evidence-reading prompt. It always runs interactively even if the configured Codex mode is streaming. No API keys or companion token are forwarded. The first Claude action is to inspect and propose, with no cloning, installation or project execution until the person reviews it in Claude Code.

Sixteen focused companion/runner tests passed, including unchanged Codex streaming behavior, Claude argv, secret exclusion, invalid/unavailable harness rejection, trusted bundle generation, noninteractive Claude rejection, and nonzero-exit reporting. Companion TypeScript compilation passed. These are real local HTTP/subprocess tests using a fake harness binary, not a claim of a verified live Claude account or native window. The original `open_repository` acquisition design above is still a proposal; this patch provides the approved-plan handoff only.
