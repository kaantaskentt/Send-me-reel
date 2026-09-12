# The smallest stack that can deliver the promise

Research and public-code inspection: **12 September 2026**. No packages installed, account credentials read, paid calls made, or acquisition integrations exercised. Prices are observed list rates; scenarios are assumptions, not bills. This challenges the earlier architecture instead of treating it as settled.

## Decision

**Use two model vendors, one local evidence store, and one execution harness.** Google supplies audiovisual understanding and ordinary evidence-backed chat; OpenAI supplies Astra for difficult adaptation and execution. Local tools do acquisition, decoding, OCR, search and process control. Apify is an optional third vendor for acquisition reliability, not another mandatory user subscription.

Do not optimize for the fewest logos at the expense of successful imports. Nor add Exa, a browser SaaS, a video indexing platform, a vector database, an ASR subscription, and an orchestration service preemptively. The same Gemini key can cover video, image interpretation, chat and occasional web grounding. One persistent conversation can call different models without exposing separate product modes.

**A useful change:** make Gemini Flash versus Lite an evaluation decision. In the base scenario below, moving all reading/chat from Lite to Flash adds about $3.52/month at current promotional rates; running all chat through Astra adds about $39.88. Avoid degrading the core understanding experience to save the smaller amount.

## What Agent Reach actually adds

Inspected Agent Reach **`da5044d26fc6adddb6554d5679c94ac22e76e428`**, package 1.5.0. Its Instagram channel delegates to OpenCLI `search/profile/user/explore`; it does not itself retrieve an exact post's complete media. The implementation is predominantly discovery, installation guidance, backend selection and health checks. Useful ideas: ordered fallbacks, precise readiness states and separating platform adapters from the agent. [Pinned Instagram channel](https://github.com/Panniantong/agent-reach/blob/da5044d26fc6adddb6554d5679c94ac22e76e428/agent_reach/channels/instagram.py), [backend probing](https://github.com/Panniantong/agent-reach/blob/da5044d26fc6adddb6554d5679c94ac22e76e428/agent_reach/backends/opencli.py)

**Checking its upstream changed the answer.** OpenCLI **`8271afc67e8504bda94c147f446ee29775d08274`**, package 1.8.8, has an Instagram **`download`** adapter. It requests media metadata within the user's logged-in browser, validates the returned shortcode, supports images/videos/ordered carousels, and chooses the widest available rendition. Tests cover missing video renditions, wrong identity, malformed payloads, login errors and zero-byte files. These are inspected tests, not tests run here. [Pinned adapter](https://github.com/jackwener/opencli/blob/8271afc67e8504bda94c147f446ee29775d08274/clis/instagram/download.js), [tests](https://github.com/jackwener/opencli/blob/8271afc67e8504bda94c147f446ee29775d08274/clis/instagram/download.test.js)

It is not a finished ContextDrop integration: caption/structured manifest are not returned, the command prints a saved directory and returns null, and the selected URL only receives basic protocol validation there. Wrap or adapt the narrow reader: fixed target post, caption, every item in order, bounded download bytes, MIME/duration/hash verification, recoverable partial status. Its code explicitly records a broken predecessor GraphQL query; a live regression corpus is essential. **`post` and `reel` are publishing commands**, not read commands. Do not expose the entire command catalog to acquisition.

For our research, Agent Reach helps discover platform-specific search/read routes, particularly public GitHub issues and logged-in community discussion. It is not an evidence-quality filter or additional intelligence. Its broad free-service claim needs qualification: Exa's own MCP documentation says its free plan is for casual use and production requires a key. We already have a browser/search tool, so installing a second toolkit would not by itself improve this research. [Exa MCP](https://exa.ai/docs/reference/exa-mcp)

## Acquisition with a small maintenance surface

| Source | First reader | Recovery and honest limit |
|---|---|---|
| Public YouTube | Native Gemini for quick meaning; yt-dlp for local encoded frames | Native URL understanding cannot establish local all-frame capture. If download fails, report the missing evidence capability. |
| Instagram | Evaluate pinned OpenCLI exact-media reader using an explicitly connected browser | No login or reader failure: capped Apify attempt or user-shared original. Do not silently import an author's latest post. |
| TikTok/X video | Platform-tested yt-dlp adapter plus page/post metadata | Supported-site lists are not live success evidence; return accessible text separately from unavailable media. |
| Website/GitHub | Bounded HTTP + Readability; official GitHub endpoints | Browser only for content requiring actual interaction. Preserve canonical identity and captured date. |
| Image/carousel/upload | Original ordered items | Read caption and every slide independently, then synthesize across them. |

Apify's maintained Instagram actor documents exact post/Reel inputs and carousel/media fields. Its public pricing metadata currently lists **$0.0027 per result event on the Free account tier**, $0.0023 Bronze and $0.0015 Gold; the headline “from $1.50/1,000” is not a universal rate. Actual account terms, number of emitted results and retries determine charges. It is economically reasonable to test this fallback rather than spend weeks recreating acquisition. [Actor documentation](https://apify.com/apify/instagram-scraper), [pricing](https://apify.com/apify/instagram-scraper/pricing), [public pricing metadata](https://api.apify.com/v2/acts/apify~instagram-scraper)

## Preserve frames locally; buy reasoning selectively

Keep the original encoded asset, presentation timestamps and per-range decode accounting. Decode every frame without FPS reduction for transient-detail detection. OCR candidates at original resolution; retain one-frame changes and inspect uncertain crops with adjacent context. A candidate filter can still miss text, so exhaustive OCR of a selected interval must remain possible. Never describe a low-FPS native overview as every-frame inspection.

Apple Vision provides local text recognition; whisper.cpp provides optional local speech transcription with Apple Silicon acceleration. Neither removes the need for audiovisual reasoning. Local inference trades API expense for installation size, battery, heat, latency and maintenance—measure all of those on a representative Mac. [Apple Vision](https://developer.apple.com/documentation/vision/recognizing-text-in-images), [whisper.cpp](https://github.com/ggml-org/whisper.cpp)

Google's current Interactions API is generally available, supports optional stored conversation state and background jobs, and is the place new capabilities launch. Its documentation still lists **remote MCP, Batch API and explicit caching as unavailable through Interactions**. Use ordinary typed local function calls; do not design around unsupported combinations. `store=false` conflicts with background execution and stored continuation. [Interactions](https://ai.google.dev/gemini-api/docs/interactions-overview)

Benchmark native agentic video for question-driven long-video reading. Its navigation is selective, not exhaustive. The documented low-resolution static estimate is about 100 input tokens/second at 1 FPS; agentic costs depend on actual frames/audio/transcripts and thinking requested. No blanket “88% discount” belongs in a forecast. [Token accounting](https://ai.google.dev/gemini-api/docs/tokens#video-token-usage-by-processing-mode)

## One database, not a vector infrastructure project

Use **SQLite + FTS5 + ordinary files** for one Mac. Store sources, ordered media, evidence, jobs, conversations, runs, checks and usage events. Full-text and trigram indexes cover exact repo names, OCR fragments and speech; typed IDs and timestamp ranges provide provenance. FTS is not semantic retrieval. Add local embeddings only if a held-out cross-source question set exposes meaningful paraphrase misses; add a hosted vector service only when multi-user scale or operational requirements warrant it. [FTS5](https://sqlite.org/fts5.html)

Run database writes through one local service with short transactions. Keep network/model calls outside transactions. Use WAL on a local disk, never a shared/synced database file, and back up using SQLite-aware mechanisms. Pin a runtime with the WAL-reset fix (3.51.3+ or the documented backport), not an assumed system SQLite version. [SQLite WAL documentation](https://sqlite.org/wal.html)

Use content hashes plus extraction-policy versions for reusable evidence. Preserve source assertions separately from verified entities and user instructions. Store original media outside the database; allow users to pin important assets, see storage use and purge originals. Deleting the original must downgrade later precise-inspection capability rather than leaving a misleading “fully available” state.

## Execution: integration gate, not another framework bet

OpenAI's managed Agents API removes custom session orchestration, compaction and recovery. Model and tool usage are billed normally; hosted containers add compute charges. A self-hosted executor supplies local files, shell and MCP through an outbound connection, but the current setup demonstrates an **alpha CLI**. Prove interruption, reconnect, approval propagation, tool access and checked artifacts before making it a release dependency. Local execution still uses cloud inference and retained session state; self-hosting does not make it ZDR. [Agents overview](https://developers.openai.com/api/docs/guides/agents-api/overview), [self-hosted executor](https://developers.openai.com/api/docs/guides/agents-api/environments/self-hosted)

If that gate fails, use one pinned local Codex bridge for the closed beta. App-server's documentation explicitly calls its command/transport experimental and unsupported for production workloads; do not quietly present it as a mature commercial backend. Existing subscription access must not be assumed to finance an embedded commercial app. [App-server](https://learn.chatgpt.com/docs/app-server)

Prefer APIs/CLI for deterministic work and browser/computer control when necessary. A finished agent message is not completion: the run must link to an actual artifact and an independent check. Keep one desktop-control lease so two agents cannot simultaneously click the user's screen.

## Costs must include failures and outcomes

Observed Standard rates: **Gemini Lite $0.30/M input, $2.50/M output; Astra short-context $10/M input, $50/M output**. Flash is $0.75/$3.75 through 31 December 2026, then $1.50/$7.50. Thinking is paid output. Google Search can charge per individual generated query; do not treat one grounded turn as one query. [Google pricing](https://ai.google.dev/gemini-api/docs/pricing), [OpenAI pricing](https://developers.openai.com/api/docs/pricing)

[Reproducible assumptions, formulas and sensitivity cases](cost-model.json). Model budgets include all turns/tool results, 15% retry overhead, targeted rereads and failed actions; no free-credit, caching or agentic discount assumptions. Support/relay figures are explicit planning allocations. Taxes, acquisition marketing, payment fees and engineering are excluded.

| Per user/month, hypothetical | Low | Base | Heavy |
|---|---:|---:|---:|
| Links / video minutes / chat turns | 30 / 60 / 40 | 150 / 450 / 300 | 500 / 2,400 / 1,200 |
| Astra actions requested | 2 | 12 | 60 |
| Reading/chat/inspection API | $0.50 | $3.30 | $13.86 |
| Astra action API | $2.53 | $15.18 | $75.90 |
| Search + optional acquisition | $0.31 | $1.59 | $6.41 |
| Total variable vendor cost | **$3.34** | **$20.07** | **$96.17** |
| Including assumed support + relay | **$4.84** | **$23.57** | **$105.17** |
| Assumed verified-action rate | 95% | 90% | 85% |
| Action model cost per verified action | $1.33 | $1.41 | $1.49 |

The base case assumes 60k aggregate input and 10k aggregate output tokens per action before retry overhead; complex work can exceed this greatly. All-Astra chat raises base service cost to **$63.45**. Applying long-context prices to all action tokens raises it to **$35.30**. Heavy usage must not be subsidized by an unlimited $29 promise. Sell bounded execution credits or BYOK, while keeping ordinary link understanding easy to use.

Local storage is also real: at an assumed 4 Mbps, base video usage ingests 13.5 GB/month; seven-day rolling raw retention holds about 3.15 GB plus evidence. The JSON includes unmeasured compute/energy assumptions to expose this tradeoff, not promise throughput. A Mac asleep, offline or busy cannot execute immediately; queue and resume visibly.

## Jobs and budgets that prevent another stalled demo

Use a persisted job ledger with stage checkpoints, leases, cancellation and idempotency keyed by source hash/policy. Initial proposed limits: one heavy decoder/OCR job, two network acquisitions, one foreground action; user questions preempt background enrichment. Retry only classified transient failures with bounded exponential backoff. Login-required and unavailable sources need a changed condition, not retry loops. Never automatically repeat an uncertain external side effect.

Reserve estimated cost before dispatch; reconcile provider usage afterward. Keep unknown usage pending rather than recording zero. Separate per-source reading, per-question rereading and per-action budgets, with a monthly maximum and visible pause/resume. Track **cost per successfully imported complete post, supported answer and verified action**, including failed attempts. These—not tokens per successful demo—decide the stack.

## Packaging and dependency limits

Agent Reach is MIT, OpenCLI Apache-2.0, SQLite public domain and whisper.cpp MIT. Preserve required notices when distributing reused code. Apple's OCR is an OS framework. yt-dlp's source/wheel is Unlicense, but some bundled executables incorporate GPLv3+ components; FFmpeg's license depends on its configured components. Audit the exact shipped binaries instead of calling the whole bundle “MIT.” [Agent Reach license](https://github.com/Panniantong/agent-reach/blob/da5044d26fc6adddb6554d5679c94ac22e76e428/LICENSE), [OpenCLI license](https://github.com/jackwener/opencli/blob/8271afc67e8504bda94c147f446ee29775d08274/LICENSE), [SQLite](https://sqlite.org/copyright.html), [yt-dlp licensing](https://github.com/yt-dlp/yt-dlp#licensing), [FFmpeg](https://ffmpeg.org/legal.html)

The next spending decision is a bounded benchmark of **complete Instagram acquisition, transient-detail recall and one verified action**. A new paid service earns its place only by improving those measurements enough to justify its cost and maintenance.
