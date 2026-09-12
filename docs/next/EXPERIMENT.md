# A brief-text capture experiment

Run on 12 September 2026, entirely offline on the development Mac. The test generated its own four-second 960 × 540, 30 FPS, lossless H.264 video. It contains no creator material, private data or functioning repository. No model API, browser session or current app capture was used.

## Question

Can uniform 1–2 FPS sampling discard readable short-lived clues before an intelligent model ever sees them? Can a cheap local all-frame pass retain those clues for closer reading?

## Observed results

| Inserted clue | Duration | Actual 1 FPS sampling | Actual 2 FPS sampling | All-frame detector | Apple Vision on candidate |
| --- | ---: | --- | --- | --- | --- |
| `github.com/example/brief-repo` | 1 frame / 33.3 ms | Missed | Missed | Retained | Exact string |
| `Use a warm paper background and a single blue action.` | 2 frames / 66.7 ms | Missed | Missed | Retained | Exact string |
| `npm run preview` | 15 frames / 500 ms | Retained | Retained | Retained | Exact string |

The all-frame change detector chose frames 0, 17, 18, 61, 63, 97 and 112: seven candidates from 120 decoded frames. Actual FFmpeg resampling was decoded and compared against the clue frames, rather than relying only on sampling arithmetic. Decode plus simple detection took 131 ms in this single run; total generation/encoding/sampling/detection took 669 ms. These are fixture timings, not a throughput benchmark or a promise about long videos.

Apple Vision read all three intended clues correctly. It also read the heading's `AI` as `Al`, which illustrates why exact text and resource identity need checking. OCR was performed on the three retained clue frames, not a live social video and not every candidate. It has no provider API charge; local hardware and energy are not free infrastructure.

Machine-readable records: [sampling/detection](transient-evidence-result.json) and [OCR output](transient-evidence-ocr.json).

## Reproduce

Run from the repository root with its existing Node dependencies and FFmpeg binary:

```sh
node scripts/experiments/transient-evidence.mjs
```

The command creates a uniquely named temporary folder and prints its path and measurements. It does not alter the active application state. To run the optional Mac OCR pass, substitute that printed path:

```sh
swift scripts/experiments/read-frame-text.swift \
  /absolute/generated-folder/candidate-017.png \
  /absolute/generated-folder/candidate-061.png \
  /absolute/generated-folder/candidate-097.png
```

The Swift source requires a working Apple toolchain and Vision framework. Results can vary by OS, hardware and library version. The generated source SHA-256 in the record identifies this run's encoded fixture.

## Interpretation and limits

The experiment supports a small, concrete conclusion: sparse sampling can miss short clues, while a separate all-frame candidate pass can retain them for reading. It does not show that ContextDrop catches every frame of Instagram, understands a whole video like a person, reconstructs hidden prompts or handles real compression/motion correctly.

The simple detector counts changed pixels. A moving camera, scrolling feed or compression noise could select nearly every frame, increasing cost; a tiny low-contrast clue could be missed. This experiment decodes a four-second file into memory, which is intentionally not a production design. A long-video implementation must stream bounded frame buffers, preserve actual timestamps, use tiled text/change detection, and measure memory/thermal behavior on the target Mac.

The next test is the mixed synthetic and real-content evaluation described in [BUILD-PLAN.md](BUILD-PLAN.md). Candidate recall, OCR accuracy, source acquisition and completed user tasks must be measured independently. The synthetic result is a mechanism check, not a substitute for that acceptance test.
