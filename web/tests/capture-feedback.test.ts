import test from "node:test";
import assert from "node:assert/strict";
import { getCaptureFailure, captureStageLabel } from "../src/lib/capture-feedback";

test("failed capture exposes a safe actionable cause for the reported metadata overflow", () => {
  const failure = getCaptureFailure({ status: "failed", error_message: "stdout maxBuffer length exceeded", metadata: {} });
  assert.equal(failure?.code, "METADATA_TOO_LARGE");
  assert.match(failure!.message, /information was too large/);
  assert.equal(failure?.retryable, true);
});

test("duration failures explain the measured length and do not encourage the same unsupported retry", () => {
  const failure = getCaptureFailure({ status: "failed", error_message: "", metadata: { duration: 723, local_capture: { errorCode: "VIDEO_TOO_LONG" } } });
  assert.match(failure!.message, /12m 3s/);
  assert.match(failure!.message, /up to 10 minutes/);
  assert.equal(failure?.retryable, false);
});

test("capture diagnostics never send arbitrary provider output or local paths to the browser", () => {
  const secret = "test-provider-secret-never-display";
  const failure = getCaptureFailure({ status: "failed", error_message: `Unauthorized Bearer ${secret} /Users/private/.env https://provider.invalid/?token=${secret}`, metadata: { local_capture: { errorCode: secret } } });
  assert.equal(failure?.code, "CAPTURE_FAILED");
  assert.equal(JSON.stringify(failure).includes(secret), false);
  assert.equal(JSON.stringify(failure).includes("/Users/"), false);
  assert.equal(getCaptureFailure({ status: "done", error_message: secret, metadata: {} }), undefined);
  assert.equal(captureStageLabel(secret), "Analyzing the video");
});

test("timeout and launch failure are terminal messages rather than waiting instructions", () => {
  assert.equal(getCaptureFailure({ status: "failed", error_message: "Capture exceeded 720 seconds", metadata: {} })?.code, "CAPTURE_TIMEOUT");
  assert.equal(getCaptureFailure({ status: "failed", error_message: "", metadata: { local_capture: { errorCode: "CAPTURE_START_FAILED" } } })?.code, "CAPTURE_START_FAILED");
  assert.equal(getCaptureFailure(null), undefined);
});
