import test from "node:test";
import assert from "node:assert/strict";
import { isLocalStudioRequest, validateLocalSourceUrl } from "../src/lib/local-studio";
import { readBoundedJson } from "../src/lib/bounded-json";

const env = { NODE_ENV: "development", CONTEXTDROP_LOCAL_STUDIO: "1" } as NodeJS.ProcessEnv;
test("local studio requires explicit development opt-in and loopback host", () => {
  const headers = new Headers({ host: "127.0.0.1:3127", origin: "http://127.0.0.1:3127" });
  assert.equal(isLocalStudioRequest(headers, true, env), true);
  assert.equal(isLocalStudioRequest(headers, true, { ...env, NODE_ENV: "production" }), false);
  assert.equal(isLocalStudioRequest(headers, true, { ...env, CONTEXTDROP_LOCAL_STUDIO: "0" }), false);
  for (const host of ["evil.example", "127.0.0.1.evil.example", "localhost@evil.example", "localhost:3127.evil.example"]) assert.equal(isLocalStudioRequest(new Headers({ host }), false, env), false);
});
test("local mutations reject absent or foreign origins and cross-site requests", () => {
  assert.equal(isLocalStudioRequest(new Headers({ host: "127.0.0.1:3127" }), true, env), false);
  assert.equal(isLocalStudioRequest(new Headers({ host: "127.0.0.1:3127", origin: "https://evil.example" }), true, env), false);
  assert.equal(isLocalStudioRequest(new Headers({ host: "127.0.0.1:3127", origin: "http://127.0.0.1:3127", "sec-fetch-site": "cross-site" }), true, env), false);
});
test("local capture validates actual social hostnames and rejects credentials and local addresses", () => {
  for (const url of ["https://youtu.be/example", "https://www.instagram.com/reel/example/", "https://www.tiktok.com/@creator/video/123", "https://x.com/creator/status/123"]) assert.equal(validateLocalSourceUrl(url), url);
  for (const url of ["https://youtube.com.evil.example/video", "https://evil.example/youtube.com", "https://127.0.0.1/video", "https://user:password@youtube.com/watch?v=x", "http://youtube.com/watch?v=x", "https://youtube.com:4433/watch?v=x"]) assert.throws(() => validateLocalSourceUrl(url));
});
test("local JSON reader stops oversized chunked input without trusting Content-Length", async () => {
  const request = new Request("http://127.0.0.1/api/local/capture", { method: "POST", body: "x".repeat(4_001) });
  await assert.rejects(readBoundedJson(request, 4_000), /too large/);
  assert.deepEqual(await readBoundedJson(new Request("http://127.0.0.1", { method: "POST", body: '{"url":"https://youtu.be/x"}' })), { url: "https://youtu.be/x" });
});
