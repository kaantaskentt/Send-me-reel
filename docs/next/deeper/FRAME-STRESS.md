# A harder test of brief-frame capture

**Locally run on 12 September 2026. The earlier detector is not ready to support a “never misses a detail” claim.** This experiment used generated media only and made no paid API calls. An independent agent reviewed the scoring and found no invalidating arithmetic or selection bug; it identified the interpretation limits below.

The [reproducible script](../../../scripts/experiments/stress-transient-evidence.mjs) generated 14 H.264 clips at 960×540: 12 transient targets and two absent-target controls. Each has 60 frames, at 30 or 60 FPS. Conditions include small text, low contrast, motion, scrolling, blur, lossy compression and confusable URL characters. The detector thresholds were inherited from the first experiment and frozen before this run.

## Results

| Measurement | Observed result |
| --- | ---: |
| Decoded output frames accounted for | 840 / 840 |
| Frames passed to candidate OCR | 323 / 840 |
| Transient targets retained by the detector | 11 / 12 |
| Targets recovered as a normalized exact string from candidates | 7 / 12 |
| Known-time full-frame OCR, bypassing detection | 8 / 12 |
| Known-time, known-location crop enlarged 3× | 8 / 12 |
| Exact target spuriously recovered on absent controls | 0 / 2 |
| Targets retained by actual FFmpeg 1 FPS / 2 FPS resampling | 0 / 12 at each rate |
| Complete experiment, including rendering, encoding and OCR | 45.8 seconds on this Mac |

All positive targets deliberately start at frame 17. The zero result for uniform sampling is an adversarial timing demonstration, **not a general estimate of its accuracy**. Every target lasts one frame except the two-frame prompt; at 60 FPS a single frame lasts about 16.7 ms. Real variable-frame-rate timestamps were not tested.

| Case | Candidates | Target retained | Candidate OCR exact | Known crop exact |
| --- | ---: | --- | --- | --- |
| Large static, lossless | 3/60 | Yes | Yes | Yes |
| Small static, lossy | 3/60 | Yes | Yes | Yes |
| Tiny, heavily compressed | 3/60 | Yes | No | No |
| Low contrast, static | 1/60 | **No** | No | Yes |
| Moving background | 60/60 | Yes | Yes | Yes |
| Scrolling, small text | 60/60 | Yes | Yes | Yes |
| Moving, tiny, compressed | 60/60 | Yes | No | No |
| Blurred | 3/60 | Yes | Yes | Yes |
| Single frame at 60 FPS | 3/60 | Yes | Yes | Yes |
| Two-frame prompt | 3/60 | Yes | Yes | Yes |
| Low contrast, moving, lossy | 60/60 | Yes | No | No |
| Confusable URL characters | 3/60 | Yes | No | No |
| Absent, static | 1/60 | N/A | No exact false match | N/A |
| Absent, moving | 60/60 | N/A | No exact false match | N/A |

Full configurations, hashes, timestamps, OCR diagnostics and machine metadata are in [frame-stress-result.json](frame-stress-result.json). All candidate and oracle OCR readings are preserved in [frame-stress-ocr.json](frame-stress-ocr.json); independently rescoring them reproduced all case results. Rendered media and per-case OCR remain in the temporary output directory printed by the script; the experiment can regenerate them.

## What failed and why it changes the architecture

The low-contrast static target is the clearest actionable failure. Apple Vision could read it when given the correct frame, but the detector discarded that frame: its pixel-difference threshold was 20 while the text/background contrast was about 13. “Decode every frame” did not prevent losing readable evidence downstream.

Whole-frame motion also collapses the proposed efficiency gain. Five moving/scrolling cases kept every frame, including the moving negative control. The aggregate 323/840 would hide that problem. Production needs region-level text/change tracking and measured workload, with a conservative reread path when evidence coverage is uncertain. A hard top-K cap must not quietly discard a fleeting clue and report complete inspection.

Four targets failed even when OCR received the known full frame or known crop. Confusable letters/digits became a different URL; the heavily compressed tiny text became nonsense. Cropping produced **no gain** in this run. Candidate retention, readable extraction, correct entity identification and understanding are separate evaluations. A stronger vision model or alternate OCR might help; neither was tested here. Upscaling alone is not evidence of restored pixels.

## The architecture we should test next

1. Acquire the highest available original media and account for decoded frames in presentation order, with exact timestamps and corruption/coverage records. Never reduce FPS before the transient-detail path.
2. Use local region/text-change tracking that retains brief candidates and avoids sending every moving background to a paid model. Test low-contrast sensitivity before accepting its pruning policy.
3. Keep evidence crops, character alternatives and surrounding context. Let the agent request an exhaustive interval reread instead of assuming its first overview saw everything.
4. Resolve candidate resources against official pages using multiple clues. A repository existing is not proof that it is the repository in the video. An ambiguous character must remain ambiguous until corroborated.
5. Let audiovisual reasoning explain the sequence and answer the actual question. For longer videos, question-directed search can narrow expensive reasoning while local evidence indexing continues in the background.

This is supported by research direction, not an off-the-shelf guarantee. **MME-VideoOCR** separately tests recognition and cross-frame reasoning, and highlights temporal coverage, resolution and language-prior errors. Its evaluated models are older; its results are not a current Astra/Gemini leaderboard. **VideoNIAH** separates retrieval, ordering and counting, which should remain distinct in our evaluations. **T\*** demonstrates targeted temporal search for long-video questions; because its search starts with sampled cues, it is not a substitute for our one-frame preservation requirement. [MME-VideoOCR](https://mme-videoocr.github.io/), [VideoNIAH](https://arxiv.org/abs/2406.09367), [Stanford T*](https://ai.stanford.edu/blog/tstar/)

Google's native video interface offers static sampling and agentic navigation. The static default can miss fast details; agentic navigation selects material relevant to a question. Neither documented mode establishes that every original frame is read and correctly interpreted. Benchmark it alongside our local path rather than replacing a measurement with a model name. [Google video documentation](https://ai.google.dev/gemini-api/docs/video-understanding)

## What this experiment does not establish

These are short synthetic CFR clips with deliberate adversarial phase. No Instagram retrieval, real creator footage, audio, model reasoning, semantic prompt reconstruction, user task or long-video performance was tested. Four OCR failures have no independent human-legibility label. Matching ignores case and repeated whitespace; it is not a verbatim transcription score. Two known-target negative controls are not a broad hallucination evaluation. Processing time includes fixture construction, is hardware-specific, and is not customer import latency.

The release benchmark must include human-labeled real originals, random starting phases, different resolutions/codecs/FPS, 1/2/3/6/15-frame events, subtle color changes, multiple text regions, corrupted media, cross-frame prompts and genuinely absent content. Freeze expected answers outside the model input and keep a held-out release set. Report recognition, exact resource precision, frame coverage, candidate workload, abstention, elapsed time and cost separately. The canonical [build gates](../BUILD-PLAN.md) remain **unpassed**.
