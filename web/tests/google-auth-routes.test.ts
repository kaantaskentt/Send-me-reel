import "next/dist/server/node-environment.js";
import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { workAsyncStorage, type WorkStore } from "next/dist/server/app-render/work-async-storage.external.js";
import { workUnitAsyncStorage, type RequestStore } from "next/dist/server/app-render/work-unit-async-storage.external.js";
import { RequestCookies, ResponseCookies } from "next/dist/server/web/spec-extension/cookies.js";
import { GET } from "../src/app/api/auth/google/route";
import { POST } from "../src/app/api/auth/google/callback/route";
import { GOOGLE_FLOW_COOKIE, newGoogleState, readGoogleFlow, signGoogleFlow } from "../src/lib/google-auth-state";
import { signToken, verifyToken } from "../src/lib/auth";

const fixtureEnv = { NODE_ENV: "test", SUPABASE_URL: "https://fixture.supabase.co", SUPABASE_ANON_KEY: "fixture-anon", SUPABASE_SERVICE_KEY: "fixture-service", JWT_SECRET: "fixture-signing-secret" } as const;
const originalEnv = process.env;
const originalFetch = globalThis.fetch;
const origin = "https://app.example";
const userId = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const telegramId = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const identity = { id: "fixture-auth-user", email: "fixture@example.com", email_confirmed_at: "2026-01-01T00:00:00Z", user_metadata: { full_name: "Fixture" }, identities: [{ provider: "google" }] };
const user = { id: userId, email: identity.email, first_name: "Fixture", onboarded: true, telegram_id: null };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
beforeEach(() => {
  process.env = { ...fixtureEnv };
  globalThis.fetch = async () => { throw new Error("Unexpected network access in auth fixture"); };
});
afterEach(() => { process.env = originalEnv; globalThis.fetch = originalFetch; });

async function start(claimToken?: string) {
  const response = await GET(new NextRequest(`${origin}/api/auth/google${claimToken ? `?claim_token=${encodeURIComponent(claimToken)}` : ""}`));
  const authorize = new URL(response.headers.get("location")!);
  const callback = new URL(authorize.searchParams.get("redirect_to")!);
  return { response, authorize, state: callback.searchParams.get("state")!, cookie: response.cookies.get(GOOGLE_FLOW_COOKIE)!.value };
}
async function callback(cookie: string, state: string, body: unknown = { code: "fixture-code", state }, headers: Record<string, string> = {}, session?: string) {
  const request = new NextRequest(`${origin}/api/auth/google/callback`, { method: "POST", headers: { origin, "content-type": "application/json", cookie: `${GOOGLE_FLOW_COOKIE}=${cookie}${session ? `; cd_session=${session}` : ""}`, ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
  const mutable = new ResponseCookies(new Headers());
  if (session) mutable.set("cd_session", session);
  const store = { type: "request", phase: "action", cookies: new RequestCookies(request.headers), mutableCookies: mutable, userspaceMutableCookies: mutable } as unknown as RequestStore;
  const response = await workAsyncStorage.run({ route: "/api/auth/google/callback", isStaticGeneration: false } as WorkStore, () => workUnitAsyncStorage.run(store, () => POST(request)));
  return { response, body: await response.json(), cookies: mutable };
}
function provider(database: (url: URL, init?: RequestInit) => Response | Promise<Response>, authUser: object = identity) {
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, fixtureEnv.SUPABASE_URL);
    if (url.pathname === "/auth/v1/token") {
      assert.equal(url.searchParams.get("grant_type"), "pkce");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.auth_code, "fixture-code");
      assert.ok(body.code_verifier);
      return json({ access_token: "fixture-access-token", refresh_token: "fixture-refresh-token", token_type: "bearer", expires_in: 3600, user: authUser });
    }
    if (url.pathname === "/auth/v1/user") return json(authUser);
    return database(url, init);
  };
}

test("start uses S256 PKCE and an encrypted, HttpOnly browser cookie", async () => {
  const result = await start();
  const flow = await readGoogleFlow(result.cookie, result.state, fixtureEnv.JWT_SECRET);
  assert.ok(flow);
  assert.equal(result.authorize.pathname, "/auth/v1/authorize");
  assert.equal(result.authorize.searchParams.get("provider"), "google");
  assert.equal(result.authorize.searchParams.get("code_challenge_method"), "s256");
  assert.equal(result.authorize.searchParams.get("code_challenge"), createHash("sha256").update(JSON.parse(flow.verifier)).digest("base64url"));
  assert.equal(result.response.headers.get("cache-control"), "no-store");
  assert.equal(result.response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(result.response.cookies.get(GOOGLE_FLOW_COOKIE)?.httpOnly, true);
  assert.equal(result.response.cookies.get(GOOGLE_FLOW_COOKIE)?.sameSite, "lax");
});

test("missing configuration is a recoverable redirect or JSON failure before writes", async () => {
  delete process.env.JWT_SECRET;
  const response = await GET(new NextRequest(`${origin}/api/auth/google`));
  assert.equal(response.headers.get("location"), `${origin}/login?error=google_unavailable`);
  const result = await callback("", newGoogleState());
  assert.equal(result.response.status, 503);
  assert.equal(result.body.error, "google_unavailable");
});

test("cross-origin, malformed, oversized, missing-state and legacy callbacks fail before network access", async () => {
  const { cookie, state } = await start();
  for (const body of [null, [], "{bad", "x".repeat(4097), { code: 2, state }, { access_token: "legacy", state }, { code: "fixture-code", state, claim_token: "forged" }]) assert.equal((await callback(cookie, state, body)).response.status, 400);
  assert.equal((await callback(cookie, state, undefined, { origin: "https://evil.example" })).response.status, 403);
  assert.equal((await callback(cookie, state, undefined, { "content-type": "text/plain" })).response.status, 415);
  assert.equal((await callback(cookie, newGoogleState())).body.error, "google_expired");
  assert.equal((await callback("", state)).body.error, "google_expired");
});

test("provider rejection exposes a bounded error and creates no session", async () => {
  const { cookie, state } = await start();
  globalThis.fetch = async () => json({ error: "invalid_grant", error_description: "private provider detail" }, 400);
  const result = await callback(cookie, state);
  assert.deepEqual(result.body, { success: false, error: "google_expired" });
  assert.equal(result.cookies.get("cd_session"), undefined);
});

test("verified existing Google user gets the standard signed session and dashboard", async () => {
  const { cookie, state } = await start();
  provider((url, init) => { assert.equal(url.pathname, "/rest/v1/users"); assert.equal(init?.method, "GET"); return json(user); });
  const result = await callback(cookie, state);
  assert.deepEqual(result.body, { success: true, redirect: "/dashboard" });
  const session = result.cookies.get("cd_session");
  assert.ok(session?.httpOnly);
  assert.equal((await verifyToken(session.value))?.sub, userId);
  assert.equal(session.maxAge, 30 * 24 * 60 * 60);
  assert.equal(result.response.cookies.get(GOOGLE_FLOW_COOKIE)?.maxAge, 0);
});

test("new users receive credits and onboarding; lookup outages cannot create users", async () => {
  const { cookie, state } = await start();
  const writes: string[] = [];
  provider((url, init) => {
    if (init?.method === "GET") return json(null);
    writes.push(url.pathname);
    return json(url.pathname.endsWith("/users") ? { ...user, onboarded: false } : {});
  });
  const result = await callback(cookie, state);
  assert.equal(result.body.redirect, "/context");
  assert.deepEqual(writes, ["/rest/v1/users", "/rest/v1/credits"]);
  provider((_url, init) => { assert.equal(init?.method, "GET"); return json({ code: "fixture_database_error" }, 503); });
  const failed = await callback(cookie, state);
  assert.equal(failed.body.error, "google_account_failed");
  assert.equal(failed.cookies.get("cd_session"), undefined);
});

test("unverified email or a different provider cannot create an app account", async () => {
  const { cookie, state } = await start();
  for (const authUser of [{ ...identity, email_confirmed_at: undefined }, { ...identity, identities: [{ provider: "email" }] }]) {
    provider(() => { assert.fail("Invalid provider identity must not query app users"); }, authUser);
    assert.equal((await callback(cookie, state)).body.error, "google_failed");
  }
});

test("an existing different app session cannot be replaced or merged", async () => {
  const { cookie, state } = await start();
  provider((_url, init) => { assert.equal(init?.method, "GET"); return json(user); });
  const session = await signToken({ sub: telegramId, tid: 17, username: "fixture" });
  const result = await callback(cookie, state, undefined, {}, session);
  assert.equal(result.body.error, "account_conflict");
  assert.equal(result.cookies.get("cd_session")?.value, session);
});

test("Telegram claim stays out of provider URLs; invalid claims cannot merge accounts", async () => {
  const token = await signToken({ sub: telegramId, tid: 17, username: "fixture" });
  const { cookie, state, authorize } = await start(token);
  assert.equal(authorize.href.includes(token), false);
  assert.equal((await readGoogleFlow(cookie, state, fixtureEnv.JWT_SECRET))?.claimToken, token);
  provider((url, init) => { assert.equal(init?.method, "GET"); return json(url.searchParams.has("email") ? user : { id: telegramId, telegram_id: 99, email: null }); });
  assert.equal((await callback(cookie, state)).body.error, "google_claim_failed");
  const invalid = await GET(new NextRequest(`${origin}/api/auth/google?claim_token=invalid`));
  assert.equal(invalid.headers.get("location"), `${origin}/login?error=google_claim_failed`);
});

test("an already unified Telegram claim preserves its signed identity and skips onboarding", async () => {
  const claimToken = await signToken({ sub: userId, tid: 17, username: "fixture" });
  const { cookie, state } = await start(claimToken);
  provider(() => json({ ...user, telegram_id: 17, onboarded: false }));
  const result = await callback(cookie, state);
  assert.equal(result.body.redirect, "/dashboard");
  assert.equal((await verifyToken(result.cookies.get("cd_session")!.value))?.tid, 17);
});

test("expired or malformed encrypted flows do not reach the provider", async () => {
  const state = newGoogleState();
  const cookie = await signGoogleFlow({ state, verifier: "" }, fixtureEnv.JWT_SECRET);
  assert.equal((await callback(cookie, state)).body.error, "google_expired");
});

test("a Telegram-only claim merges through the existing account merger and signs the unified identity", async () => {
  const claimToken = await signToken({ sub: telegramId, tid: 17, username: "fixture" });
  const { cookie, state } = await start(claimToken);
  let unified = false;
  const writes: string[] = [];
  provider((url, init) => {
    const table = url.pathname.split("/").at(-1);
    const method = init?.method ?? "GET";
    if (method !== "GET") {
      writes.push(`${method} ${table}`);
      if (table === "users" && method === "PATCH" && url.searchParams.get("id") === `eq.${userId}`) unified = true;
      return json({});
    }
    if (table === "users") {
      if (url.searchParams.get("id") === `eq.${telegramId}`) return json({ id: telegramId, telegram_id: 17, telegram_username: "fixture", email: null, onboarded: true });
      return json({ ...user, telegram_id: unified ? 17 : null });
    }
    if (table === "credits") return json({ balance: 50, lifetime_used: 0 });
    if (table === "user_contexts") return json({ id: "fixture-context" });
    assert.fail("Unexpected claim read");
  });
  const result = await callback(cookie, state);
  assert.equal(result.body.redirect, "/dashboard");
  assert.equal((await verifyToken(result.cookies.get("cd_session")!.value))?.tid, 17);
  assert.ok(writes.includes("PATCH analyses"));
  assert.ok(writes.includes("DELETE users"));
});

test("a consumed provider code cannot issue another session", async () => {
  const { cookie, state } = await start();
  provider(() => json(user));
  const firstFetch = globalThis.fetch;
  let consumed = false;
  globalThis.fetch = async (input, init) => {
    if (new URL(String(input)).pathname === "/auth/v1/token") {
      if (consumed) return json({ error: "invalid_grant" }, 400);
      consumed = true;
    }
    return firstFetch(input, init);
  };
  assert.equal((await callback(cookie, state)).body.success, true);
  const replay = await callback(cookie, state);
  assert.equal(replay.body.error, "google_expired");
  assert.equal(replay.cookies.get("cd_session"), undefined);
});

test("malformed provider configuration logs only a fixed category", async (t) => {
  process.env.SUPABASE_URL = "not-a-valid-url-private-detail";
  const logger = t.mock.method(console, "error", () => {});
  const response = await GET(new NextRequest(`${origin}/api/auth/google`));
  assert.equal(response.headers.get("location"), `${origin}/login?error=google_unavailable`);
  assert.deepEqual(logger.mock.calls.map(call => call.arguments), [["[google-auth] start_failed"]]);
});

test("a concurrent signup reuses the verified user's row after a unique-key conflict", async () => {
  const { cookie, state } = await start();
  let lookups = 0;
  provider((url, init) => {
    assert.equal(url.pathname, "/rest/v1/users");
    if (init?.method === "GET") return json(++lookups === 1 ? null : user);
    assert.equal(init?.method, "POST");
    return json({ code: "23505" }, 409);
  });
  const result = await callback(cookie, state);
  assert.equal(result.body.success, true);
  assert.equal((await verifyToken(result.cookies.get("cd_session")!.value))?.sub, userId);
});
