import test from "node:test";
import assert from "node:assert/strict";
import { allowedAuthRedirect, completeGoogleCallback, googleAuthError, isSameOriginAuthRequest, parseGoogleCallback, pendingShareRedirect, providerError, providerRequestError } from "../src/lib/google-auth";
import { googleAuthConfigured, googleAuthStorage, newGoogleState, readGoogleFlow, signGoogleFlow } from "../src/lib/google-auth-state";
import { jwtVerify } from "jose";

const secret = "fixture-only-google-flow-secret";
const state = newGoogleState();
const location = `https://app.example/auth/google/callback?code=fixture-code&state=${state}`;
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });

test("flow binds state and verifier, keeps claims private, and cannot be used as an app session", async (t) => {
  const flow = { state, verifier: JSON.stringify("fixture-verifier"), claimToken: "fixture-claim" };
  const cookie = await signGoogleFlow(flow, secret);
  assert.deepEqual(await readGoogleFlow(cookie, state, secret), flow);
  assert.equal(await readGoogleFlow(cookie, newGoogleState(), secret), null);
  assert.equal(await readGoogleFlow(cookie, state, "wrong-secret"), null);
  assert.equal(await readGoogleFlow(cookie.slice(0, -8) + "tampered", state, secret), null);
  assert.equal(await readGoogleFlow(undefined, state, secret), null);
  assert.equal(cookie.includes("fixture"), false);
  await assert.rejects(jwtVerify(cookie, new TextEncoder().encode(secret)));
  t.mock.timers.enable({ apis: ["Date"], now: Date.now() + 601_000 });
  assert.equal(await readGoogleFlow(cookie, state, secret), null);
});

test("PKCE storage is per-request and required configuration fails closed", () => {
  const first = googleAuthStorage();
  first.setItem("test", "first");
  assert.equal(googleAuthStorage().getItem("test"), null);
  assert.equal(googleAuthConfigured({}), false);
  assert.equal(googleAuthConfigured({ SUPABASE_URL: "fixture", SUPABASE_ANON_KEY: "fixture", SUPABASE_SERVICE_KEY: "fixture", JWT_SECRET: "fixture" }), true);
});

test("callback input is bounded and refuses legacy tokens, claims, and malformed types", () => {
  assert.deepEqual(parseGoogleCallback({ code: "fixture-code", state }), { code: "fixture-code", state });
  for (const input of [null, [], "x", {}, { code: 1, state }, { code: "x".repeat(2049), state }, { code: "x\n", state }, { code: "ok", state: "short" }, { code: "ok", state, claim_token: "forged" }, { access_token: "legacy", state }]) assert.equal(parseGoogleCallback(input), null);
});

test("same-origin POST is required, including rejecting forged fetch metadata", () => {
  const req = (headers: Record<string, string>) => new Request(location, { headers });
  assert.equal(isSameOriginAuthRequest(req({ origin: "https://app.example" })), true);
  for (const origin of ["https://evil.example", "null", "https://app.example.evil.test"]) assert.equal(isSameOriginAuthRequest(req({ origin })), false);
  assert.equal(isSameOriginAuthRequest(req({})), false);
  assert.equal(isSameOriginAuthRequest(req({}), false), true);
  assert.equal(isSameOriginAuthRequest(req({ origin: "https://app.example", "sec-fetch-site": "cross-site" })), false);
});

test("successful callback sends only the code and state with browser credentials", async () => {
  const fetchImpl: typeof fetch = async (input, init) => {
    assert.equal(input, "/api/auth/google/callback");
    assert.equal(init?.credentials, "same-origin");
    assert.deepEqual(JSON.parse(String(init?.body)), { code: "fixture-code", state });
    return json({ success: true, redirect: "/context" });
  };
  assert.equal(await completeGoogleCallback(location, fetchImpl), "/context");
});

test("provider cancellation and failure stay distinct and never submit credentials", async () => {
  const noFetch: typeof fetch = async () => { assert.fail("Provider error must not call callback API"); };
  assert.equal(await completeGoogleCallback(location + "&error=access_denied&error_description=private", noFetch), "/login?error=google_cancelled");
  assert.equal(await completeGoogleCallback(location + "#error=server_error&error_description=private", noFetch), "/login?error=google_unavailable");
  assert.equal(await completeGoogleCallback(location + "&code=duplicate", noFetch), "/login?error=google_invalid");
  assert.equal(await completeGoogleCallback("https://app.example/auth/google/callback#access_token=private", noFetch), "/login?error=google_invalid");
  assert.equal(providerError("untrusted provider message"), "google_failed");
  assert.equal(providerRequestError({ status: 503 }, "google_expired"), "google_unavailable");
  assert.equal(providerRequestError({ status: 429 }, "google_expired"), "google_unavailable");
  assert.equal(providerRequestError({ status: 0, name: "AuthRetryableFetchError" }, "google_expired"), "google_unavailable");
  assert.equal(providerRequestError({ status: 400 }, "google_expired"), "google_expired");
  assert.equal(googleAuthError("constructor"), "google_failed");
});

test("API errors are bounded and network or malformed responses recover", async () => {
  assert.equal(await completeGoogleCallback(location, async () => json({ error: "google_unavailable" }, 503)), "/login?error=google_unavailable");
  assert.equal(await completeGoogleCallback(location, async () => json({ error: "private provider text" }, 401)), "/login?error=google_failed");
  assert.equal(await completeGoogleCallback(location, async () => { throw new Error("private network detail"); }), "/login?error=google_network");
  assert.equal(await completeGoogleCallback(location, async () => new Response("not JSON", { status: 502 })), "/login?error=google_network");
  assert.equal(await completeGoogleCallback(location, async () => json({ success: true, redirect: "/context" }, 401)), "/login?error=google_failed");
});

test("redirects allow only product destinations and safely handle pending shares", () => {
  assert.equal(allowedAuthRedirect("/context"), "/context");
  for (const destination of ["//evil.example", "https://evil.example", "/api/auth/logout", "/\\evil.example", "javascript:alert(1)", null]) assert.equal(allowedAuthRedirect(destination), "/dashboard");
  assert.equal(pendingShareRedirect(encodeURIComponent("https://example.com/video?a=b=c")), "/share?url=https%3A%2F%2Fexample.com%2Fvideo%3Fa%3Db%3Dc");
  for (const value of [undefined, "%broken", "javascript:alert(1)", "https://user:password@example.com", "x".repeat(4097)]) assert.equal(pendingShareRedirect(value), null);
});
