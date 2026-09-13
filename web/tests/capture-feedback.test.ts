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

test("oversized merged videos receive a fixed terminal message without private diagnostics", () => {
  const failure = getCaptureFailure({ status: "failed", error_message: "private file /Users/example/video.mp4?token=secret", metadata: { local_capture: { errorCode: "VIDEO_TOO_LARGE" } } });
  assert.equal(failure?.code, "VIDEO_TOO_LARGE");
  assert.equal(failure?.retryable, false);
  assert.match(failure!.message, /100 MiB/);
  assert.match(failure!.message, /compressed copy/);
  assert.match(failure!.message, /Retrying the same download will not help/);
  assert.ok(!failure!.message.includes("secret"));
  assert.ok(!failure!.message.includes("/Users/"));
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

test("non-video social posts provide the upload path instead of an endless video retry", () => {
  for (const detail of ["ERROR: There is no video in this post", "No video could be found in this tweet", "This post contains an image"]) {
    const failure = getCaptureFailure({ status: "failed", error_message: detail, metadata: {} });
    assert.equal(failure?.code, "SOURCE_HAS_NO_VIDEO");
    assert.equal(failure?.retryable, false);
    assert.match(failure!.message, /does not yet import these posts automatically/);
    assert.match(failure!.message, /upload/);
  }
});

test("platform access and unavailable metadata are distinguished from unsupported image content", () => {
  const blocked = getCaptureFailure({ status: "failed", error_message: "HTTP Error 403: Forbidden", metadata: {} });
  assert.equal(blocked?.code, "SOURCE_UNAVAILABLE");
  assert.match(blocked!.message, /saved copy/);
  const metadata = getCaptureFailure({ status: "failed", error_message: "private details", metadata: { local_capture: { errorCode: "METADATA_LOOKUP_FAILED" } } });
  assert.equal(metadata?.code, "METADATA_LOOKUP_FAILED");
  assert.equal(metadata?.message.includes("private details"), false);
});
