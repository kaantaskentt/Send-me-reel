import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { extractUrl, detectPlatform } from "../src/pipeline/urlRouter.js";

const ID = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";
const KEY = "33333333-3333-4333-8333-333333333333";

function isolatedSubmission(options: { data?: unknown; error?: { message: string } | null; authenticated?: boolean; throws?: boolean } = {}) {
  const source = readFileSync(new URL("../web/src/app/api/analyze/route.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const dependencies: Record<string, unknown> = {
    "next/server": { NextResponse: { json: (body: unknown, init?: { status: number }) => ({ body, status: init?.status ?? 200 }) } },
    "node:crypto": { randomUUID: () => ID },
    "@/lib/auth": { getSession: async () => options.authenticated === false ? null : { sub: USER } },
    "@/lib/url-utils": { extractUrl, detectPlatform },
    "@/lib/supabase": { getSupabase: () => ({
      rpc: async (name: string, args: Record<string, unknown>) => {
        calls.push({ name, args });
        if (options.throws) throw new Error("Network unavailable");
        return { data: options.data === undefined ? ID : options.data, error: options.error ?? null };
      },
      from: () => { throw new Error("Manual credit or insert fallback must never run"); },
    }) },
  };
  runInNewContext(compiled, { exports, console: { error() {} }, require: (name: string) => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`);
    return dependencies[name];
  } });
  const request = (body: unknown, key?: string) => ({ json: async () => body, headers: new Headers(key ? { "Idempotency-Key": key } : {}) });
  return { post: exports.POST, calls, request };
}

test("web submission atomically reserves and queues for the authenticated user", async () => {
  const route = isolatedSubmission({ data: KEY });
  const response = await route.post(route.request({ url: "https://youtu.be/example", note: "  reproduce this  ", user_id: "attacker-chosen-user" }, KEY));
  assert.equal(response.status, 200);
  assert.equal(response.body.analysisId, KEY);
  assert.equal(route.calls.length, 1);
  assert.equal(route.calls[0].name, "create_analysis_with_credit");
  assert.equal(route.calls[0].args.p_user_id, USER);
  assert.equal(route.calls[0].args.p_analysis_id, KEY);
  assert.equal(route.calls[0].args.p_note, "reproduce this");
  assert.equal(route.calls[0].args.p_source, "web");
});

test("missing migration, false charge results and uncertain network responses fail closed", async () => {
  for (const options of [
    { error: { message: "create_analysis_with_credit missing from schema cache" } },
    { data: false }, { data: null }, { data: "not-an-analysis-id" }, { throws: true },
  ]) {
    const route = isolatedSubmission(options);
    const response = await route.post(route.request({ url: "https://youtu.be/example" }));
    assert.equal(response.status, 503);
    assert.match(response.body.error, /temporarily unavailable/);
    assert.equal(route.calls.length, 1);
  }
});

test("insufficient balance returns402 and conflicting request keys return409", async () => {
  for (const [message, status] of [["INSUFFICIENT_CREDITS", 402], ["ANALYSIS_ID_CONFLICT", 409]] as const) {
    const route = isolatedSubmission({ error: { message } });
    const response = await route.post(route.request({ url: "https://youtu.be/example" }));
    assert.equal(response.status, status);
  }
});

test("invalid submissions and missing sessions do no billing work", async () => {
  const route = isolatedSubmission();
  for (const body of [{ url: 12 }, { url: "file:///etc/passwd" }, { url: "https://youtu.be/example", note: "a".repeat(4001) }]) {
    assert.equal((await route.post(route.request(body))).status, 400);
  }
  assert.equal((await route.post(route.request({ url: "https://youtu.be/example" }, "bad-key"))).status, 400);
  assert.equal(route.calls.length, 0);
  const unauthenticated = isolatedSubmission({ authenticated: false });
  assert.equal((await unauthenticated.post(unauthenticated.request({ url: "https://youtu.be/example" }))).status, 401);
  assert.equal(unauthenticated.calls.length, 0);
});

process.env.TELEGRAM_BOT_TOKEN = "offline-test";
process.env.OPENAI_API_KEY = "offline-test";
process.env.SUPABASE_URL = "https://offline-test.invalid";
process.env.SUPABASE_SERVICE_KEY = "offline-test";
const { supabase } = await import("../src/db/client.js");
const { create } = await import("../src/db/analyses.js");
const { refundAnalysis } = await import("../src/db/credits.js");

test("Telegram billing and refunds use the atomic RPC contracts and reject malformed returns", async () => {
  const originalRpc = supabase.rpc;
  const calls: Array<{ name: string; args: unknown }> = [];
  const results: Array<{ data: unknown; error: { message: string } | null }> = [
    { data: ID, error: null }, { data: false, error: null },
    { data: true, error: null }, { data: false, error: null },
    { data: null, error: { message: "RPC unavailable" } },
  ];
  supabase.rpc = (async (name: string, args: unknown) => { calls.push({ name, args }); return results.shift(); }) as unknown as typeof supabase.rpc;
  try {
    assert.equal(await create({ userId: USER, sourceUrl: "https://youtu.be/example", platform: "youtube", analysisId: ID }), ID);
    await assert.rejects(create({ userId: USER, sourceUrl: "https://youtu.be/example", platform: "youtube", analysisId: ID }), /invalid result/);
    assert.equal(await refundAnalysis(ID), true);
    assert.equal(await refundAnalysis(ID), false); // already refunded is a confirmed safe result
    await assert.rejects(refundAnalysis(ID), /RPC unavailable/);
    assert.equal(calls[0].name, "create_analysis_with_credit");
    assert.deepEqual(calls[2], { name: "refund_analysis_credit", args: { p_analysis_id: ID } });
  } finally { supabase.rpc = originalRpc; }
});
