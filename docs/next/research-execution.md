# Execution architecture

The recommended direction is one existing agent harness with ContextDrop supplying media evidence, project context, explicit action scope, and result checks. An agent that creates a plan, another that rewrites it, and a third that launches an unrelated terminal is unnecessary for the first customer journey.

Research checked on 12 September 2026. The API capabilities below are documented, not connected or exercised in ContextDrop in this research pass. Installed runtime inspection found Codex CLI 0.153.2 and OpenAI Node SDK 6.33.0; the SDK's beta export currently lacks `agents`. Integration needs a deliberately pinned compatible SDK/runtime, not a blind copy of a new example into the existing server.

## Runtime choice

| Option | Decision |
| --- | --- |
| OpenAI Agents API with a self-hosted Mac executor | Preferred integration spike for the new standalone experience. Reuses managed Codex orchestration; prove account access, Mac operation, cancellation, reconnects and approval handling before selecting it for release. |
| Local Codex app-server over stdio | Development fallback for a Mac beta using the installed harness. Do not present it as a supported production backend: its current documentation explicitly warns about production maturity. |
| Codex SDK | Good for bounded coding jobs, or an early content-to-harness bridge. It is not by itself a polished computer-use product. |
| Claude Agent SDK | A later optional execution adapter. Do not implement two primary harnesses before one has passed the whole journey. |
| Another custom general agent loop | Reject for the first version. Own the evidence and product experience; reuse the harness. |

The Agents API manages agent sessions, context compaction, recovery and orchestration. It charges model/tool usage and applicable hosted compute; it does not make long-running work free. Session state is retained, current data residency is US-only, and ZDR is not supported even with a self-hosted executor.[^1] This is a **local execution, cloud inference** product unless a different architecture is deliberately selected.

For self-hosted environments, the documented arrangement is a cloud-managed harness plus `codex exec-server` on a laptop/container. The executor opens an outbound connection and supplies shell, files and local MCP capabilities. It uses a separate restricted environment key. Each session needs an executor associated with its environment ID. The setup currently demonstrates an alpha CLI; this is a real compatibility and maturity gate.[^2] A chosen workspace folder alone does not provide OS isolation.

App-server is intended for rich custom clients with authentication, history, streamed events and approvals. Its documentation warns that the command and WebSocket transport are experimental and unsupported for production workloads. Prefer a pinned, process-owned stdio transport for a development integration; do not expose an unauthenticated listener.[^3] The official Codex SDK separately documents automation and application integration; its Python distribution uses a pinned runtime.[^4]

## Model choice and cost

GPT-6 Astra is a valid API model ID, `gpt-6-astra`. The current model page lists text/image inputs and text output; use a video-specific reader to supply audio/visual evidence. Its API effort values are `low`, `medium`, `high`, `xhigh`, and `max`. The desktop's Ultra setting must not be blindly copied into an API enum.[^5] Honor the chosen model, inspect supported capabilities, and show unavailable access instead of silently changing models.

At current short-context Standard rates, Astra is $10/M input and $50/M output. A hypothetical task totaling 50,000 uncached input tokens and 10,000 output tokens across all calls costs $1.00 in model usage; 200,000 input plus 20,000 output costs $3.00. These are arithmetic examples, not observed ContextDrop run costs. Cache writes, tool calls and other services can add charges.[^6]

Astra should do difficult interpretation, project adaptation and execution. Routine retrieval should use deterministic tools and compact evidence. Deeper reasoning is useful when it changes the outcome; it should not be a mandatory tax on every saved link. A paid plan needs explicit usage allowances or bring-your-own credentials. Agent usage fields are best-effort and may arrive late; missing usage is not zero, and reasoning tokens are billed output.[^7]

## Computer use is a capability we must connect

The OpenAI computer-use guide supports a model proposing executable browser/desktop code or structured actions. The application supplies and preserves the environment, executes permitted actions, and returns fresh screenshots. Conversation continuation does not restore a browser or its runtime variables.[^8] Therefore, selecting Astra does not automatically grant ContextDrop the computer-use tool available inside this Codex desktop task.

For the first supported actions, use direct APIs/CLI for cloning, file work and verifiable checks, and a persistent browser tool for websites. A native Mac helper is a separate capability for apps without a suitable interface. It needs permission setup, display-coordinate handling, app identity, observed state after actions and an exclusive control lease. Do not ask for full desktop access merely to identify a repository.

The interaction contract should be one approved outcome and work scope, followed by autonomous ordinary reversible steps. Ask at an actual boundary such as account consent, payment, secret entry or publishing. Show the exact target and reason when help is needed. Let users pause, steer, take over and stop from the same conversation. A global stop must cancel queued work and interrupt active tools as far as their interfaces allow; a completed external action cannot be undone by cancellation.

Claude's interactive Mac computer-use feature requires an eligible authenticated setup and is not available in noninteractive `-p` mode.[^9] The Agent SDK exposes the agent loop, tools, permissions, hooks and sessions, but its current documentation says third-party products need API-key authentication unless separately approved to offer claude.ai login.[^10] Do not promise users that their existing subscription automatically funds an embedded commercial adapter, or that its native desktop tools are included.

## Small implementation surface

Use a TypeScript local service, SQLite for source/jobs/run metadata, a file store for original media/crops, and a React UI. Package the proven experience in Electron for the first Mac distribution so the existing TypeScript and browser work is reusable. Keep Node disabled in the renderer, expose a typed IPC boundary and package a signed helper for the few native functions actually needed. These are architecture recommendations, not an installed app.

The public landing page can remain Next.js. Do not keep a separate hosted intelligence implementation. Both the desktop conversation and a future phone inbox should address the same session/source contracts. A small authenticated relay is justified for phone-to-Mac delivery once the desktop core works; a full cloud media lake is not required.

Expose a narrow ContextDrop tool set to the selected harness: `read_source`, `search_evidence`, `inspect_moment`, `resolve_resource`, and `get_project_context`. Execution should return an `Artifact` and a `Check` record, not just an agent statement. The same evidence tools can later ship as MCP/CLI for users who prefer their existing agent UI. Treat adapter output, repository instructions, captions and OCR as source data, never authorization.

## First integration spike

Before moving the main UI, make a small throwaway-workspace session prove all of the following:

1. Compatible SDK, runtime and account access; record exact versions and model/effort accepted.
2. A grounded user request can call a local evidence tool and display streamed progress.
3. A bounded browser action and file edit actually occur in the selected environment.
4. A scope boundary becomes a real user decision; rejection stops the action.
5. Interrupt, connection loss, process restart and resume preserve the same session without duplicate side effects.
6. The result links to a real artifact and an independent observable check.
7. Usage and errors are recorded without leaking keys or copying private local context unnecessarily.

If the managed path fails these checks, use the local harness bridge for the closed beta and document its maturity limits. Keep one chosen adapter in the actual product path. Do not accumulate half-integrated runtimes.

## Sources

All documentation below was fetched on 12 September 2026. It establishes documented capability, not account entitlement or live integration success.

[^1]: OpenAI, [Agents API overview](https://developers.openai.com/api/docs/guides/agents-api/overview).
[^2]: OpenAI, [Self-hosted sandboxes](https://developers.openai.com/api/docs/guides/agents-api/environments/self-hosted).
[^3]: OpenAI, [Codex App Server](https://learn.chatgpt.com/docs/app-server).
[^4]: OpenAI, [Codex SDK](https://learn.chatgpt.com/docs/codex-sdk).
[^5]: OpenAI, [GPT-6 Astra model](https://developers.openai.com/api/docs/models/gpt-6-astra).
[^6]: OpenAI, [API pricing](https://developers.openai.com/api/docs/pricing).
[^7]: OpenAI, [Agents API observability and usage](https://developers.openai.com/api/docs/guides/agents-api/observability).
[^8]: OpenAI, [Computer use](https://developers.openai.com/api/docs/guides/tools-computer-use).
[^9]: Anthropic, [Computer use in Claude Code CLI](https://code.claude.com/docs/en/computer-use).
[^10]: Anthropic, [Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview).
