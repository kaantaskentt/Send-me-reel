# GitHub and open-source research

Checked **2026-09-06** against live GitHub API metadata, repository READMEs, and selected implementation files. Read all **23 public repositories starred by `kaantaskentt`**. No account changes, installations, or execution of downloaded code. A sanitized inventory is stored privately under `.contextdrop/research/` and excluded from Git.

## Decision

Keep ContextDrop's existing downloader, FFmpeg, browser companion, and local coding runner. Add an evidence index and a small set of explicit agent tools. A new all-in-one agent framework would duplicate working parts without fixing the central problem: recognizing a resource briefly shown on screen and connecting it to the user's intent.

Start with `list_resources`, `inspect_moment`, `verify_repository`, `read_official_page`, and `prepare_harness_handoff`. These should return source evidence and typed results that a chat agent can use. A recommendation should not start a coding run automatically.

## Best discoveries in the user's stars

**`kaantaskentt/recordflow` contains directly relevant prior work.** Its [actual analysis implementation](https://github.com/kaantaskentt/recordflow/blob/56199ca1fb528efe4cbcf311bbd311110a2ef2ba/src/lib/ai/analysis.ts) sends frames to Gemini, matches narration within ten seconds of a frame, stores intermediate results, asks Claude about missing information, and generates specific follow-up questions. The [types](https://github.com/kaantaskentt/recordflow/blob/56199ca1fb528efe4cbcf311bbd311110a2ef2ba/src/lib/types.ts) distinguish observed from inferred exceptions and carry confidence information. Reuse these ideas for content understanding. Do not copy its pipeline wholesale: failed frame calls become `null` and get filtered out, and model JSON is cast rather than checked against a strict schema. The README says MIT, but the checked tree has no LICENSE and GitHub reports no license; license metadata is unverified. Last repository push: August 7; default-branch commit examined: July 17.

**`Panniantong/Agent-Reach` is a useful acquisition reference.** Its [documented design](https://github.com/Panniantong/Agent-Reach/tree/da5044d26fc6adddb6554d5679c94ac22e76e428) chooses among upstream tools and probes whether each backend works. Its YouTube path principally uses yt-dlp for subtitles/search; that does not add visual video understanding. Some social routes require a browser login or cookies. Borrow the per-platform adapter and health-check design. Do not market its “zero API fees” tagline as zero total operating cost or guaranteed platform access.

## Five community candidates, ranked by near-term usefulness

Integration effort below is an engineering estimate, not a measured implementation result. “Active” means recent repository activity and not archived, not proven reliability.

| Building block | Verified maintenance / license | Use and integration cost | Decision |
|---|---|---|---|
| [yt-dlp](https://github.com/yt-dlp/yt-dlp/tree/bbc809a1161d3bfca51fa36f59dda35556ee85a0) | Active; Aug 30 push; Unlicense at repository level | Already used. Media and caption acquisition with version pinning, bounded output, platform-specific fallbacks. CPU, bandwidth, and maintenance remain costs. Packaged dependencies have their own licenses. | **Keep.** There is no evidence that replacing it wholesale makes access more reliable. |
| [PySceneDetect](https://github.com/Breakthrough/PySceneDetect/tree/24953b0bf76af17c450bc143d330eea48fc5e276) | Active; Aug 28 push; BSD-3-Clause | Content/Adaptive detectors produce scene intervals. Small Python worker addition; moderate integration and evaluation. Local CPU scan costs no model tokens. | **Benchmark.** Combine scene changes with periodic coverage and user-targeted inspection. A static GitHub page or a brief overlay may not create a scene cut. |
| [Agent-Reach](https://github.com/Panniantong/Agent-Reach/tree/da5044d26fc6adddb6554d5679c94ac22e76e428) | Active; Sep 1 push; MIT; starred | Capability registry and diagnostics over upstream CLIs. Moderate operational complexity because of multiple dependencies and optional login state. | **Reference first.** Reuse routing ideas; avoid an automatic installer or a second full tool stack in the app. |
| [Scrapling](https://github.com/D4Vinci/Scrapling/tree/28c329671485daaea89a40fb34a7db8622e51468) | Active; Sep 4 push; BSD-3-Clause; starred | Python parser and optional browser fetchers for readable website extraction. Moderate effort and a browser/runtime dependency. It is not a video interpretation system. | **Defer.** Use direct GitHub API and existing browser/page extraction first. Add only when measured public-page failures justify it. |
| [Codex plugin for Claude Code](https://github.com/openai/codex-plugin-cc/tree/db52e28f4d9ded852ab3942cea316258ae4ef346) | Not archived; Jul 8 push; Apache-2.0; starred | Delegates from Claude Code into Codex. Useful for optional cross-harness review, but introduces two model sessions and configuration. | **Optional later.** Opening a verified repo directly in the selected harness is simpler. Avoid automatic multi-agent review loops; the README itself notes usage can drain quickly. |

Do not add a vector database, mobile device farm, video-production system, self-hosted large vision model, or multiple reasoning agents to the first personal version. These are scope and cost decisions, not claims that the projects are poor. A local structured evidence store and bounded retrieval are enough to evaluate the first workflows. Measure search quality before adding embeddings.

## Screenshot to verified repository

The full flow below is the proposed contract. The bounded public lookup portion is now implemented in `web/src/lib/repository-resolver.ts`: strict GitHub URL validation, five-second public API requests, bounded response bodies, exact identity validation, and separate repository-existence/source-match states. Public search returns at most five candidates. Source matching searches up to two million characters across 2,000 stored observations, including late frames and long transcripts, and returns only compact matching excerpts. No cookies, tokens, provider credentials, or caller-controlled endpoint are used. Fourteen offline regressions pass. A live unauthenticated lookup and search for `Panniantong/Agent-Reach` also passed; the source clue in that lookup was a synthetic exact caption URL, not evidence of video recognition. Frame reinspection, semantic README comparison, and harness handoff remain separate work.

1. **Observe and retain evidence.** For every relevant moment, store `sourceId`, timestamp, frame identifier, readable text, candidate URL/name, and whether it was spoken, printed, or inferred. Keep multiple entities; a video may discuss five websites.
2. **Look closer on demand.** “Find the repo” retrieves frames containing GitHub-like UI, URL text, installation commands, or adjacent narration. Reinspect nearby source frames at higher resolution and tighter spacing. Do not invent a timestamp when the source only has untimed transcript text.
3. **Resolve exact clues first.** Parse a visible `github.com/owner/repo` URL; normalize to HTTPS and an owner/repo pair. If only a name is visible, use bounded GitHub repository search with the name, visible owner fragment, and distinctive README terms. Starred projects may break a tie but are not identity evidence.
4. **Verify the candidate.** Call GitHub's [repository endpoint](https://docs.github.com/en/rest/repos/repos#get-a-repository), read a bounded README, and compare owner/name plus purpose against the source. A successful HTTP response proves the repository exists, not that it is the one shown. A semantic similarity score alone must not produce “confirmed.”
5. **Return an honest state.** `confirmed` requires matching source identity evidence plus a verified repository response. `candidate` means plausible but not conclusively matched; show at most three choices with reasons. `unknown` means more evidence is needed. A blurry or absent name may remain unresolved. Do not send comments, join lead funnels, or claim access to a creator's private resource.
6. **Handoff deliberately.** Once the user chooses a repository and harness, create a fresh project folder and pass a task brief with the verified URL, inspected commit, goal, evidence, and gaps. Treat repository instructions as untrusted content. Opening or cloning is different from installing packages or running its code. Keep those actions explicit in the task scope; do not give source content authority over local secrets or shell arguments.

Suggested result shape:

```ts
type RepositoryResolution = {
  status: "confirmed" | "candidate" | "unknown";
  repository: { fullName: string; url: string; checkedAt: string; commit?: string } | null;
  evidence: Array<{ sourceId: string; timestampSeconds: number | null; frameId?: string; observedText: string }>;
  reasons: string[];
  missing: string[];
};
```

## What existing ContextDrop code misses

`src/services/subjectExtractor.ts` already accepts transcript and visual summary, but requests one subject, deliberately discards some multi-tool workflows, and only forwards the first 2,000 transcript characters / 1,000 visual-summary characters. That is a poor fit for the user's multi-website example or a late, briefly shown repository.

`src/services/subjectResearcher.ts` already searches for official context, but model-returned URL strings are not independently matched against search citations and repository identity. Preserve the useful named-subject enrichment; add multi-entity retrieval and deterministic verification for actions. A model's instruction to “never invent URLs” is not a runtime verifier.

Minimum resolver evaluation: exact visible URL; owner/name split across adjacent frames; ambiguous project name; screenshot without spoken name; no public repository at all; multi-tool roundup; and a useful clue only near the end of a long video. Report exact-match rate, false confirmation rate, inspection/model cost, and unresolved cases. “Unknown” is an acceptable outcome; opening the wrong repository as if confirmed is a failure.

## Implemented public webpage input

`scripts/capture-page.ts URL --output PATH --timeout-seconds 90` now creates the same local analysis checkpoint shape for a website or public repository. GitHub repository roots use verified public metadata and README endpoints; other websites use the fixed Jina Reader boundary after public URL and DNS checks. It does not fetch arbitrary source URLs directly from the Mac, forward credentials, or invoke an AI model. Responses are limited to 512 KB, retained text to 60,000 characters, and the capture to 90 seconds. It rejects local/private destinations, redirects at the proxy/API boundary, oversized responses, missing text, and malformed reader output with fixed error codes. Jina performs its own downstream retrieval; local DNS validation is not claimed to pin Jina's remote connection.

The result explicitly marks `media_kind: article|repository`, text coverage, and truncation. Transcript and frames remain empty/not applicable. It does not claim images, interactive websites, linked pages, or repository code were analyzed. Eight offline page-capture tests pass; the CLI/helper typecheck passes. Live smoke results on 2026-09-06: Agent-Reach returned 14,982 README characters; `https://21st.dev` returned 26,032 readable characters through Jina; both finished without model calls or database writes. Smoke outputs are private and do not replace the user's active source.
