# Analysis timings and limits — 17 September 2026

Status: measured personal-beta samples, **not platform-wide speed or accuracy guarantees**. Code inspected at `732bd2e` in the Developer checkout. One fresh Instagram capture was run on 17 September; other measurements below come from preserved capture records. No source files, active capture, conversations, or library entries were changed by this audit.

## Short answer

- Today's fresh 51-second Instagram Reel took **84.53 seconds to capture and analyze**. Including process startup, the isolated command took **86.67 seconds**. The app's subsequent suggestions/chat are extra.
- Earlier successful Instagram samples took **38.51–65.14 seconds**, X **28.52 seconds**, and YouTube **21.23 / 49.79 seconds**. These are dated individual results, not averages or promises.
- **TikTok has no real timing measurement** in the evidence inspected. Supported routing is not a successful live test.
- The **4.65-second result reported previously was finding a repository in chat after the video had already been analyzed**, not watching a new video.
- The current app is usable for personal testing, but an instant, reliable “any social link” promise is unsupported. There is no measured platform-wide success rate, P95, or fleeting-detail recall score.

## What the stopwatch measures

Persisted capture time is `completed_at - metadata.local_capture.startedAt`. It includes source metadata retrieval and, for downloaded social videos, download, local probing, bounded screen-detail scanning, video upload/processing, native Gemini inference, and file cleanup.

It excludes the UI's network/render time, its polling delay, the separate initial-guide request, subsequent conversation, repository lookup, and any execution task. `LocalCapture.tsx` polls every three seconds; `ContentStudio.tsx` separately posts a guide request to `/api/local/chat`. Therefore **capture finished is not the same measurement as paste-to-three-useful-suggestions**. The latter is not instrumented end to end yet.

Fresh here means a new capture/output with fresh source acquisition and a real model request, not an app-library lookup or resumed checkpoint. Provider-internal/network caches are outside our control; the native manifests below report zero cached input tokens.

## Today's real capture

Source: [Instagram Reel Dc7hhAUEvu1](https://www.instagram.com/reel/Dc7hhAUEvu1/), already supplied by the owner. Measured media length **51.308 seconds**.

| Stage | Seconds |
|---|---:|
| Source metadata | 5.838 |
| Video download | 11.117 |
| Actual media duration check | 1.367 |
| Hybrid analysis including local scan, upload, Gemini, cleanup | 66.164 |
| Persisted start to completion | **84.531** |
| Full isolated command, including startup | **86.666** |

UTC start: `2026-09-17T08:50:33.671Z`; complete: `2026-09-17T08:51:58.202Z`. Capture ID: `7bf30c79-7743-487a-8e77-03a4cfeddfa7`.

The current configured Gemini key was present; no credential was printed. Reader: `auto` → Gemini; model: `gemini-3.5-flash-lite`. The test used the same `scripts/analyze-one.ts` worker selected for Instagram, an isolated temporary output, and a 180-second capture deadline. Exit code was zero and `capture_complete` was true. No separate OpenAI/Whisper reader was invoked.

Inside the hybrid stage:

- Local scan: **39.184 seconds**, 3,078 decoded frames, reached the end of the source.
- **12 detail crops** were selected for model input; 2,673 candidate frames existed. Decoding all source frames does **not** mean the AI understood all of them. Semantic coverage remains explicitly partial.
- Native model request: **25.549 seconds**, one attempt, 18 validated observations. The source video overview is sampled at 1 FPS, low resolution, supplemented by the bounded high-resolution crops.
- Returned usage: 18,683 input tokens, 1,814 output tokens, zero reported cached tokens. This is usage evidence, not an invoice.
- One temporary provider file was deleted; no pending provider cleanup was recorded.

Upload and local scan overlap, so their times must not be added as if all stages are sequential. The model request waits for selected crop preparation. The 39-second scan is a material part of this sample's delay.

Private evidence (not committed): `/var/folders/v4/6vssxxr937d9mby4p2xp73_00000gn/T/contextdrop-timing-20260917-k76id583/analysis.json`, with stdout/stderr logs in the same directory. This successful run validates current availability, ingestion, schema/coverage completion, and cleanup. It is **not a new independent human assessment of the semantic correctness of every observation**.

### Small visual spot check

After the capture, two preserved crops were inspected directly: 4.8 seconds visibly contains **Taste Skill** and **TASTESKILL.DEV**, matching the extracted name/domain; 40.52 seconds shows the `img2three…` heading and Apache 2.0 / version 1.4.4 badges, consistent with the extracted img2threejs candidate but without a visible owner URL. The generated speech paraphrase also says “image 23.js” while its on-screen field says `img2threejs`: spoken-name normalization still needs reconciliation with visual evidence. This two-image spot check supports useful extraction, not full-video accuracy or exact repository ownership.

## Preserved successful samples

All URLs below are canonicalized for readability; tracking parameters were omitted. Dates are UTC.

| Platform / source | Video length | Capture seconds | Date | Reader / scope |
|---|---:|---:|---|---|
| [Instagram Dc7hhAUEvu1](https://www.instagram.com/reel/Dc7hhAUEvu1/) | 51.308 s | **65.141** | 15 Sep | Fresh download, Gemini native video + local detail crops |
| [Instagram DdO1UioAHAS](https://www.instagram.com/reel/DdO1UioAHAS/) | 48.492 s | **48.058** | 15 Sep | Fresh download, Gemini native video + local detail crops |
| [Instagram DdRxjWhlrNC](https://www.instagram.com/reel/DdRxjWhlrNC/) | 41.068 s | **38.505** | 15 Sep | Fresh download, Gemini native video + local detail crops |
| [X sairahul1/2099198172862001153](https://x.com/sairahul1/status/2099198172862001153) | 25.194 s | **28.523** | 15 Sep | Fresh download, Gemini native video + local detail crops |
| [YouTube o3IEkKXXXvo](https://www.youtube.com/watch?v=o3IEkKXXXvo) | 29m 57s | **49.790** | 9 Sep | Metadata + Gemini direct YouTube overview, three sequential segments |
| [YouTube QhmhUgccaS0](https://www.youtube.com/watch?v=QhmhUgccaS0) | 8m 37s | **21.232** | 6 Sep | Metadata + Gemini direct YouTube overview, one segment |
| TikTok | — | **Not measured** | — | Routing exists; no live timing proof found |

The YouTube path is lighter: it does not download the source locally or run the downloaded-video pixel scan. These numbers do not establish that long YouTube videos receive the same tiny-screen-text scrutiny as downloaded Reels. None of these captures establishes that every millisecond or every prompt was correctly understood.

Per-stage seconds from preserved social checkpoints:

| Source | Metadata | Download | Probe | Hybrid stage | Total |
|---|---:|---:|---:|---:|---:|
| Instagram Dc7hhAUEvu1 | 2.507 | 6.202 | 0.998 | 55.421 | 65.141 |
| Instagram DdO1UioAHAS | 2.124 | 5.751 | 1.662 | 38.504 | 48.058 |
| Instagram DdRxjWhlrNC | 2.596 | 4.740 | 1.051 | 30.095 | 38.505 |
| X 2099198172862001153 | 1.683 | 7.135 | 1.032 | 18.658 | 28.523 |

The 29m57s YouTube sample's native segments took 17.991, 13.805, and 9.566 seconds. Its record does not separately time metadata retrieval. The 8m37s sample's native model segment took 6.870 seconds; the rest of its 21.232 seconds is pre/post-request overhead and is not separately instrumented.

Evidence IDs, in table order: `d5f65698-009e-4390-83ee-8d10712a38ce`, `06c9a931-2277-4a0c-98f9-37452d361b8c`, `ba0ecb75-cad2-4134-b92e-f20fbb1eb1c6`, `1b59baa2-ef8f-4ca8-9a01-a49c3691a1ce`, `fef2867b-2669-4743-bccd-305c31effd37`, `6bf9e885-6962-40e0-b52c-1d89f2e62b9c`. The latter is `.contextdrop/gemini-smoke-v2-analysis.json`; most others are in the private library, and `ba0ecb75…` was the active capture when inspected.

There are also preserved failures: Instagram retrieval/format failures on 13 September and incomplete Gemini captures on 15 September, followed by repaired retries. The records are engineering iterations, not a fixed independent sample population. Dividing these successes/failures into a reliability percentage would be misleading.

## Other speeds must be labelled separately

- Public repository lookup after capture: **4.650 seconds**; injected GitHub-unavailable fallback with real web search: **10.270 seconds**, 15 September. Evidence: `.contextdrop/acceptance/public-lookup-2026-09-15.json`. These are conversation/tool timings.
- Public page reading on 6 September: GitHub Agent-Reach **2.088 seconds**, 21st.dev **8.341 seconds**, example.com **1.519 seconds**. These are text capture, not video understanding or a full agent result.
- An earlier OpenAI sampled-frame/Whisper YouTube capture took **132.939 seconds** for the same 8m37s source. It is a different reader and must not be mixed into a Gemini latency average.
- Cached library reopening and exact-question inspection-cache hits have no fresh timing measurement here. Do not call them “instant” based on design intent alone.

## Current code limits

| Route | Implemented limit | What it means |
|---|---|---|
| Downloaded Instagram, TikTok, X and detailed YouTube | **10 minutes; 100 MiB** | Actual downloaded duration and size are validated. Retrieval may still fail before analysis. |
| Gemini direct public YouTube | **60 minutes**, ten-minute segments | A maximum accepted duration, not a measured 60-minute reliability result. Current segments execute sequentially and have resumable checkpoints. |
| Uploaded video/audio | **60 minutes; 200 MiB** | A separate upload route, not proof of platform link access. |
| Local detail scan | **45 seconds / 18,000 frames / 12 crops** | Bounded heuristic detail selection; semantic coverage stays partial even if decoding reaches the end. |
| Native overview | **1 FPS / low resolution** | Broad audiovisual context, not all-original-frame recognition. |
| Focused native reread | **Up to 30 seconds / 2 FPS / high resolution** | YouTube/upload targeted inspection; downloaded social follow-up is still limited to saved evidence. |
| Local web-triggered capture | **720-second processing timeout** | A runtime timeout, **not** a 12-minute maximum source length or expected wait. |

The local social capture worker directly uses yt-dlp. It does **not** inherit the hosted scraper's Apify fallback. Photo/carousel ingestion does not gain universal coverage merely because Instagram video routing exists.

Code references: `web/src/lib/capture-routing.ts`, `web/src/app/api/local/capture/route.ts`, `scripts/analyze-video.ts`, `scripts/capture-gemini.ts`, `src/services/frameExtractor.ts`, `src/services/mediaRuntime.ts`, `src/services/precisionVideo.ts`, `src/services/precisionVideoCapture.ts`, `src/services/geminiVideo.ts`, `src/services/uploadedContent.ts`.

## Critique and next speed work

1. Measure **paste → first useful answer**, full evidence completion, and successful action separately. Add per-stage wall clocks, failure reasons, cache status, and source length to every run. Present facts from the current stage; do not show a fabricated percentage.
2. Give the user the caption/title and explicit “reading video” state early, then update the useful answer when video evidence arrives. This can improve perceived responsiveness without pretending a caption is video analysis.
3. The current full-resolution JavaScript pixel scan consumed 39 seconds on today's 51-second/60-FPS Reel. Profile and optimize candidate detection, with identical evidence tests. Consider fast overview plus background detail indexing, then targeted high-detail rereads. Do not simply drop crops to claim speed while losing the product's brief-detail requirement.
4. Reuse an existing successful capture by canonical source identity and media hash, while distinguishing stale metadata from reusable media evidence. Avoid paying for a complete repeated analysis when only the follow-up question changed.
5. Validate extraction accuracy with annotated, held-out short-screen-text cases. A schema-valid response, reached-end decoder, or existing GitHub URL is insufficient evidence of correct comprehension or exact creator provenance.
6. Run independent repeated real examples per platform before stating a normal range or guarantee. Include blocked/private/deleted posts, variable network/CPU pressure, carousels, silent clips, long videos and TikTok; report denominator, median, P95, and failure reasons.

Today the honest promise is: **“Paste an accessible link, ask about the captured content, check evidence, and prepare a reviewed action.”** It is not yet **“Any post, instantly, with no missed details.”**
