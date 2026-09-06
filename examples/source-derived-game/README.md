# A real source-derived result

Run `npm run local:result` from the repository root and open http://127.0.0.1:3130/.

This is the saved result of a real ContextDrop local run on 2026-09-06, not a new generation or a promise that all runs succeed. The source was [Creator Magic's Codex tutorial](https://www.youtube.com/watch?v=Gda-1msq7pg). The goal recreated its wizard block-breaker game section before 4:11, excluding cloud deployment and accounts. The actual capture supplied a speech transcript and sampled frame observations to the reviewed plan. Codex then generated these three original HTML/CSS/JavaScript files in a fresh workspace.

Independent Chromium testing found and fixed one resize bug after generation. Sixteen checks passed on the corrected result. `verification.json` records the source, run ID, checks, correction, limitations and final file hashes. Phone testing used browser emulation; win/loss transitions used controlled game state. This is an adaptation of the observed idea, not a copy of the creator's source code.

The server exposes only the three static files on a separate loopback origin from the trusted studio. It does not run the capture, planner or companion, and needs no provider key. Keep this distinction explicit when presenting a saved result.
