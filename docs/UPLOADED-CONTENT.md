# Local uploaded content

The local studio accepts a saved file when a social platform cannot supply a public video. It also reads screenshots/design references, PDF documents, audio and UTF-8 text. Uploaded files are source evidence, never commands to execute.

## Input contract

`POST /api/local/upload` sends the raw `File` body, not multipart or a local file path. Headers:

- `Content-Type`: the browser's file type (the server selects the supported reader from the validated extension).
- `X-ContextDrop-Filename`: `encodeURIComponent(file.name)`.
- Optional `X-ContextDrop-Question`: `encodeURIComponent(question)`; maximum 2,000 characters.

The development server requires the matching loopback `Origin`, and returns `202 {status:"starting",id,sourceUrl}`. Poll the existing `GET /api/local/capture` for status, `mediaKind`, progress and a fixed safe error message. Link capture also accepts an optional JSON `question` with the same length limit.

| Source | Accepted formats | Bound | Evidence |
|---|---|---|---|
| Video | MP4, MOV, WebM | 200 MiB, measured duration up to 60 minutes | Gemini audiovisual overview in ten-minute clips |
| Audio | MP3, M4A, WAV, OGG | 200 MiB, measured duration up to 60 minutes | Locally extracted ten-minute audio clips; timestamped speech paraphrases |
| Image | PNG, JPEG, WebP | 20 MiB, 40 megapixels | Sanitized JPEG plus visual observations and legible text |
| PDF | PDF | 20 MiB, 100 pages | Ten-page groups, preserved original page numbers |
| Text | TXT, Markdown, CSV, JSON | 1 MiB, valid UTF-8 | Complete text without a capture model call |

Gemini is required for media and PDF capture; existing chat provider configuration is still required to chat. Access to a public social URL remains platform dependent. Uploading a file does not bypass login or download restrictions.

Direct image/PDF URLs currently go through the public-page reader. They are not automatically fetched into the native upload readers. To inspect their visual contents, save the accessible file and upload it.

## Identity and storage

Each upload has a generated UUID, SHA-256 hash, measured size, content kind and original display filename. `contextdrop://upload/UUID` is a local evidence identity, not a public URL. The raw file lives at `.contextdrop/uploads/UUID/source.EXT`; user-supplied filesystem paths are never accepted. Reads validate identity, hash and the actual path. The previous analysis is archived before changing the active source. Capture, upload and library switches share the same launch lock.

The original file remains on this Mac for follow-up questions. It is not placed in a public bucket. Media is sent to the configured Gemini account for reading. Temporary Gemini Files API objects are deleted in a `finally` block, with deletion counts recorded under `metadata.source_evidence.provider_files`. If immediate deletion fails, the checkpoint includes a warning; Google documents a 48-hour automatic expiry. Abrupt process termination can also leave a provider object until that expiry.

## Focused questions

`inspectUploadedContent` accepts only the stored UUID and a question. It revalidates the original file before reading:

- Video/audio: an existing range of up to 30 seconds. The clip is extracted locally before upload; returned timestamps are translated to the original source timeline.
- PDF: one to five existing pages. Observations retain original page numbers.
- Image: the saved sanitized image.
- Text: already available to the source evidence retriever.

An uncached focused inspection creates a fresh Gemini request and uses the configured provider account. Uploads retain their original file locally rather than keeping a paid model context or a long-lived provider file. Video/audio follow-up uploads contain only the requested short clip; PDF follow-ups contain only the requested pages. Repeating capture of a file starts a new model reading, so avoid retrying a successfully completed capture just to ask a follow-up question.

Every requested capture section must return validated evidence before the source is marked complete. Failed captures preserve completed sections, but uploaded capture retries currently start a fresh capture; they do not yet reuse partial provider work. A completed overview does not mean every frame, line, or tiny label was read. Focused inspection exists to answer questions that the overview cannot establish.

## Verification, 2026-09-09

The isolated automated suite covers bounded streaming, cancellation, identity/tamper/path checks, PDF chunk/page validation, no-model text capture, real local media duration/clip extraction, original timestamp restoration, provider cleanup on errors and fixed provider origins. Existing YouTube and public-page reader tests passed alongside it (36 targeted tests in total at this checkpoint).

Four real Gemini captures also completed against generated fixtures without replacing the user's active video:

- PNG: read the visible title, `github.com/example/fixture-demo`, and button text.
- Two-page PDF: returned the distinct statement from each page.
- Three-second MP4: read the visible text; completed coverage was exactly 0–3 seconds.
- 2.759-second spoken audio: returned a relevant paraphrase, with a minor proper-name transcription error and no fabricated visual evidence.

Each real capture reported one provider file deleted and zero pending cleanup. These prove the wired capture paths; they are not a claim of perfect understanding of arbitrary content.

Primary API references: [Gemini Files API](https://ai.google.dev/gemini-api/docs/files), [video understanding](https://ai.google.dev/gemini-api/docs/video-understanding), [document understanding](https://ai.google.dev/gemini-api/docs/document-processing).
