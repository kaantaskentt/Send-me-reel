# Content workspace verification — 2026-09-09

## Final automated checks

- **172** backend/web unit and integration tests pass, including stored evidence retrieval, uploaded media, provider cleanup, private file boundaries, source identities, workspace persistence and task context.
- **7** content-studio browser tests pass, including saved conversations, chosen actions, source-safe Markdown, link/file controls, project/workflow UI, dialog keyboard containment and draft preservation through reload and in-flight replies.
- **3** existing replication/rehearsal browser tests pass. These exercise pairing/action contracts with fixtures; they are not proof of native desktop execution.
- Backend and companion TypeScript checks pass. The optimized Next.js build passes, including all new local routes.
- Deployment trace inspection: 69 trace files contained no `.contextdrop` content or environment files.
- Browser layouts checked at desktop width and 651×889 / 390×844. Current source identity stays above chat on narrow screens and the composer remains in view. The real in-app browser was visually inspected after integration.

## Real source and provider checks

The user's source remains `https://www.youtube.com/watch?v=o3IEkKXXXvo`, **29m57s**. All three requested native video ranges completed. The capture has 29 audiovisual observations; completion is not exhaustive frame/text verification.

1. **Repository investigation:** the content agent reinspected 624–632s, searched GitHub, verified that `heygen-com/hyperframes` exists, and retained the ambiguity in the video's conflicting owner text. Completed in 19.59s. It offered a candidate link without preparing or running a task.
2. **Saved-source comparison:** the agent read the saved `Panniantong/Agent-Reach` page without changing the current video, compared the two sources, and returned a validated secondary-source citation. Completed in 12.411s. These two smoke calls used isolated conversation inputs; the user's conversation was not overwritten.
3. **Image upload:** a real PNG reader recovered fixture heading, repository text and button text.
4. **Document upload:** a real two-page PDF reader separately identified both fixture pages.
5. **Video upload:** a real three-second MP4 was measured and analyzed over 0–3s with its visible fixture text recovered.
6. **Audio upload:** a real 2.75925-second audio file yielded an appropriate speech paraphrase with no invented visual observations. Brand spelling in speech was imperfect, demonstrating why paraphrases are labelled.
7. **Focused uploaded-video inspection:** only the original 1–2s interval was extracted and sent for reinspection. The result's timestamp was translated back to 1s in the original file.

All four initial uploaded-media fixtures reported one temporary provider file deleted and no pending cleanup. Focused video inspection reported no cleanup warnings. Provider state and local fixtures were tested outside the active source directory. See [upload contracts and limits](UPLOADED-CONTENT.md).

The real HTTP text-upload endpoint returned202, reached `done`, retained the original source in Library and restored it with200. Only the generated test source/upload was removed afterward. Existing videos and conversations were preserved.

The real conversation action generated a **five-step editing plan** with **33 source evidence entries** and measurable success criteria. It remains a prepared plan, not an executed editing job.

## State and boundaries

The local studio and Mac companion are running. Companion capabilities are checked through its authenticated health endpoint; no new Terminal or browser task was launched as part of this verification. Coding/browser launch contracts retain their existing tests.

- New UI and content tools are implemented locally; they are not deployed to production.
- Social platform access can fail. Public YouTube supports up to60minutes; other social-video links retain the existing ten-minute reader. Uploads are the explicit fallback within documented size/duration bounds.
- Uploaded PDF/image observations and native video/audio summaries can omit tiny details; follow-up inspection narrows the question. This is not a claim to answer every possible question from any source.
- Multi-source chat currently reads up to three additional sources per turn, using lexical retrieval over stored evidence. It is not a global semantic index of every saved original frame.
- Saved workflows are reusable drafts. The app does not promote them to tested automations merely because the user saved or exported them.
- General native Mac control, unattended account setup, arbitrary media artifact verification, a cloud sandbox, durable multi-user orchestration, and commercial rollout remain further work.

Historical checks remain in [the earlier companion verification report](CONTENT_COMPANION_VERIFICATION.md).
