import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { EventEmitter } from "node:events";
import ts from "typescript";
import { jwtVerify } from "jose";
import { detectPlatform as workerPlatform } from "../src/pipeline/urlRouter.ts";
import * as webUrlModule from "../web/src/lib/url-utils.ts";
import { isPublicAddress, resolvePublicUrl } from "../src/services/publicUrl.ts";
import * as mediaModule from "../web/src/lib/media-proxy.ts";
import * as notionStateModule from "../web/src/lib/notion-oauth-state.ts";
import * as ytDlpMetadata from "../src/services/ytDlpMetadata.ts";

// The nested web package is CommonJS when imported by the worker's ESM tests.
const { detectPlatform: webPlatform } = (webUrlModule as any).default || webUrlModule;
const { downloadPublicMedia, parseMediaUrl, validProxySecret } = (mediaModule as any).default || mediaModule;
const { createNotionOAuthState, verifyNotionOAuthState } = (notionStateModule as any).default || notionStateModule;

// Execute the real route/service body with inert dependencies. No keys, external
// accounts, shell execution, DNS queries, or live databases are used by this suite.
function loadIsolated(file: string, dependencies: Record<string, unknown>) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText;
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  runInNewContext(compiled, {
    exports, URL, Buffer, console: { log() {}, error() {} },
    process: { env: {} }, setTimeout, clearTimeout,
    require(name: string) {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

test("both URL routers classify the origin rather than a social hostname in the path", () => {
  const cases = [
    ["https://www.youtube.com/watch?v=demo", "youtube"],
    ["https://youtu.be/demo", "youtube"],
    ["https://www.instagram.com/reel/demo/", "instagram"],
    ["https://vm.tiktok.com/demo/", "tiktok"],
    ["https://x.com/person/status/123", "x"],
    ["https://evil.example/youtube.com/watch", "article"],
    ["https://notyoutube.com/watch", "article"],
    ["https://youtube.com.evil.example/watch", "article"],
    ["https://youtube.com@evil.example/watch", "unknown"],
    ["https://127.0.0.1/youtube.com/watch", "unknown"],
    ["http://2130706433/youtube.com/watch", "unknown"],
    ["http://[::ffff:127.0.0.1]/", "unknown"],
    ["file:///etc/passwd", "unknown"],
    ["https://localhost/", "unknown"],
    ["https://service.local/", "unknown"],
    ["https://youtube.com:8443/watch", "unknown"],
  ];
  for (const [url, expected] of cases) {
    assert.equal(workerPlatform(url), expected, `worker: ${url}`);
    assert.equal(webPlatform(url), expected, `web: ${url}`);
  }
});

test("scraping passes shell metacharacters literally to an executable with an argument terminator", async () => {
  let call: any[] = [];
  const service = loadIsolated("src/services/scraper.ts", {
    child_process: { execFile: (...args: any[]) => {
      call = args.slice(0, 3);
      args[3](null, { stdout: JSON.stringify({ source: { id: "demo", duration: 1, title: "demo" } }), stderr: "" });
    } },
    util: { promisify: (fn: (...args: any[]) => void) => (...args: any[]) => new Promise((resolve, reject) => fn(...args, (err: Error | null, result: unknown) => err ? reject(err) : resolve(result))) },
    "../pipeline/types.js": { ServiceError: Error },
    "./apifyScraper.js": { scrapeWithApify() { throw new Error("Unexpected fallback"); } },
    "./mediaRuntime.js": { resolveYtDlpExecutable: () => "yt-dlp" },
    "./ytDlpMetadata.js": ytDlpMetadata,
  });
  const url = "https://youtube.com/watch?v=$(:);echo-inert";
  await service.scrapeVideo("youtube", url);
  assert.equal(call[0], "yt-dlp");
  assert.deepEqual(Array.from(call[1]).slice(-2), ["--", url]);
  assert.ok(Array.from(call[1]).includes("--js-runtimes"));
  assert.ok(Array.from(call[1]).includes("node"));
  assert.ok(call[1].includes("--no-playlist"));
  assert.equal(call[2].shell, undefined);
});

test("downloads use literal arguments, restore certificate verification, and cap playlist/file size", async () => {
  let call: any[] = [];
  const service = loadIsolated("src/services/storage.ts", {
    child_process: { execFile: (...args: any[]) => {
      call = args.slice(0, 3);
      args[3](null, { stdout: "", stderr: "" });
    } },
    util: { promisify: (fn: (...args: any[]) => void) => (...args: any[]) => new Promise((resolve, reject) => fn(...args, (err: Error | null, result: unknown) => err ? reject(err) : resolve(result))) },
    "fs/promises": { mkdir: async () => {} },
    fs: { existsSync: () => true, statSync: () => ({ size: 2000 }) },
    path: { join: (...parts: string[]) => parts.join("/") },
    "../pipeline/types.js": { ServiceError: Error },
    "ffmpeg-static": "/fixture/ffmpeg",
    "./mediaRuntime.js": { resolveYtDlpExecutable: () => "yt-dlp", ANALYSIS_VIDEO_FORMAT: "bv*[height<=1080]+ba/b[height<=1080]" },
  });
  const url = "https://youtube.com/watch?v=$(:)";
  await service.downloadVideo(url, "analysis-demo");
  assert.equal(call[0], "yt-dlp");
  assert.deepEqual(Array.from(call[1]).slice(-2), ["--", url]);
  assert.ok(Array.from(call[1]).includes("--js-runtimes"));
  assert.ok(Array.from(call[1]).includes("node"));
  assert.ok(call[1].includes("--max-filesize"));
  assert.ok(call[1].includes("--no-playlist"));
  assert.ok(!call[1].includes("--no-check-certificates"));
});

test("proxy credential fails closed for missing, empty, and wrong secrets", () => {
  assert.equal(validProxySecret(null, undefined), false);
  assert.equal(validProxySecret("", ""), false);
  assert.equal(validProxySecret("   ", "   "), false);
  assert.equal(validProxySecret("wrong", "expected"), false);
  assert.equal(validProxySecret("expected", "expected"), true);
});

test("proxy allowlist rejects private hosts, credentials, host lookalikes and custom ports", () => {
  assert.equal(parseMediaUrl("https://scontent.cdninstagram.com/video.mp4").hostname, "scontent.cdninstagram.com");
  for (const url of ["https://[::1]/", "https://127.0.0.1/", "https://cdninstagram.com.evil.example/", "https://evil.example/cdninstagram.com", "http://cdninstagram.com/", "https://a:b@cdninstagram.com/", "https://cdninstagram.com:8443/"]) {
    assert.throws(() => parseMediaUrl(url), undefined, url);
  }
});

test("public address validation excludes alternate loopback, private, reserved and mapped IPv6", () => {
  for (const address of ["127.0.0.1", "10.0.0.1", "172.31.1.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "198.18.0.1", "192.0.2.1", "224.0.0.1", "::1", "::ffff:8.8.8.8", "fc00::1", "fe80::1", "2001:db8::1", "2002:7f00:1::", "3fff::1"]) {
    assert.equal(isPublicAddress(address), false, address);
  }
  assert.equal(isPublicAddress("8.8.8.8"), true);
  assert.equal(isPublicAddress("2606:4700:4700::1111"), true);
});

test("DNS resolution rejects any private answer before making a media request", async () => {
  const lookup = (async () => [{ address: "8.8.8.8", family: 4 }, { address: "127.0.0.1", family: 4 }]) as any;
  await assert.rejects(resolvePublicUrl("https://example.com", lookup), /non-public/);
  await assert.rejects(downloadPublicMedia("https://video.cdninstagram.com/a.mp4", {
    lookup, request: (() => { throw new Error("NETWORK SHOULD NOT RUN"); }) as any,
  }), /non-public/);
});

function mediaNetwork(status: number, headers: Record<string, string>, chunks: string[]) {
  let requests = 0;
  let pinned = "";
  const request = ((_url: URL, options: any, callback: (response: any) => void) => {
    requests++;
    options.lookup("video.cdninstagram.com", {}, (_err: unknown, address: string) => { pinned = address; });
    const req = new EventEmitter() as any;
    req.destroy = (error: Error) => { queueMicrotask(() => req.emit("error", error)); return req; };
    req.end = () => queueMicrotask(() => {
      const response = new EventEmitter() as any;
      response.statusCode = status;
      response.headers = headers;
      response.complete = true;
      callback(response);
      for (const chunk of chunks) response.emit("data", Buffer.from(chunk));
      response.emit("end");
    });
    return req;
  }) as any;
  return { request, stats: () => ({ requests, pinned }) };
}

const publicLookup = (async () => [{ address: "8.8.8.8", family: 4 }]) as any;

test("proxy pins DNS to the checked IP while accepting bounded video data", async () => {
  const network = mediaNetwork(200, { "content-type": "video/mp4" }, ["abc", "def"]);
  const result = await downloadPublicMedia("https://video.cdninstagram.com/a.mp4", { ...network, lookup: publicLookup, maxBytes: 8 });
  assert.equal(result.toString(), "abcdef");
  assert.deepEqual(network.stats(), { requests: 1, pinned: "8.8.8.8" });
});

test("proxy refuses redirects instead of following an unchecked destination", async () => {
  const network = mediaNetwork(302, { location: "http://169.254.169.254/" }, []);
  await assert.rejects(downloadPublicMedia("https://video.cdninstagram.com/a.mp4", { ...network, lookup: publicLookup }), /redirect/);
  assert.equal(network.stats().requests, 1);
});

test("proxy enforces size limits when Content-Length is absent", async () => {
  const network = mediaNetwork(200, { "content-type": "video/mp4" }, ["1234", "56789"]);
  await assert.rejects(downloadPublicMedia("https://video.cdninstagram.com/a.mp4", { ...network, lookup: publicLookup, maxBytes: 8 }), /size limit/);
});

test("cross-account magic links cannot merge or replace an existing session", async () => {
  let cookieWrites = 0;
  const filters: any[] = [];
  const query: any = {
    select() { return this; }, eq(...args: any[]) { filters.push(args); return this; },
    single: async () => ({ data: { id: "attacker", telegram_id: 123, email: null } }),
  };
  const route = loadIsolated("web/src/app/auth/route.ts", {
    "next/server": { NextResponse: { redirect: (url: URL) => ({ location: url.href }) } },
    "@/lib/auth": {
      verifyToken: async () => ({ sub: "attacker", tid: 123 }),
      getSession: async () => ({ sub: "victim" }),
      setSessionCookie: async () => { cookieWrites++; },
      signToken: async () => { throw new Error("Must not mint an attacker session"); },
    },
    "@/lib/supabase": { getSupabase: () => ({ from: () => query }) },
  });
  const response = await route.GET({ nextUrl: new URL("https://example.com/auth?token=attacker-valid-token") });
  assert.match(response.location, /account_conflict/);
  assert.equal(cookieWrites, 0);
  assert.deepEqual(filters, [["id", "attacker"]]);
});

test("todo creation rejects another user's analysis before inserting a joinable row", async () => {
  const filters: any[] = [];
  const query: any = {
    select() { return this; }, eq(...args: any[]) { filters.push(args); return this; },
    single: async () => ({ data: null }),
  };
  const route = loadIsolated("web/src/app/api/analyses/[id]/todos/route.ts", {
    "next/server": { NextResponse: { json: (body: any, options: any) => ({ body, status: options?.status ?? 200 }) } },
    "@/lib/auth": { getSession: async () => ({ sub: "attacker" }) },
    "@/lib/supabase": { getSupabase: () => ({ from: (table: string) => {
      assert.equal(table, "analyses", "must verify ownership before touching todos");
      return query;
    } }) },
  });
  const response = await route.POST({ json: async () => ({ title: "attacker todo" }) }, { params: Promise.resolve({ id: "victim-analysis" }) });
  assert.equal(response.status, 404);
  assert.deepEqual(filters, [["id", "victim-analysis"], ["user_id", "attacker"]]);
});

test("Notion OAuth state binds the browser nonce and user, and cannot become a login JWT", async () => {
  const secret = "test-fixture-secret-not-a-live-credential";
  const state = await createNotionOAuthState("user-a", "browser-nonce", "analysis-a", secret);
  assert.deepEqual(await verifyNotionOAuthState(state, "browser-nonce", "user-a", secret), { analysisId: "analysis-a" });
  assert.equal(await verifyNotionOAuthState(state, "another-browser", "user-a", secret), null);
  assert.equal(await verifyNotionOAuthState(state, "browser-nonce", "user-b", secret), null);
  assert.equal(await verifyNotionOAuthState(state, undefined, "user-a", secret), null);
  assert.equal(await verifyNotionOAuthState("analysis-a", "browser-nonce", "user-a", secret), null);
  assert.equal(await verifyNotionOAuthState(state, "browser-nonce", "user-a", "different-key"), null);
  await assert.rejects(jwtVerify(state, new TextEncoder().encode(secret)), /signature verification failed/);
});

test("Notion callback rejects invalid state before credentials are exchanged or a user is modified", async () => {
  const route = loadIsolated("web/src/app/api/auth/notion/callback/route.ts", {
    "next/server": { NextResponse: { redirect: (url: URL) => ({ location: url.href }) } },
    "next/headers": { cookies: async () => ({ get: () => ({ value: "browser-nonce" }), delete: () => { throw new Error("Invalid state must not consume another flow"); } }) },
    "@/lib/auth": { getSession: async () => ({ sub: "victim" }) },
    "@/lib/supabase": { getSupabase: () => { throw new Error("Invalid state reached database"); } },
    "@/lib/notion-push": { pushToNotion: () => { throw new Error("Invalid state reached Notion"); } },
    "@/lib/notion-oauth-state": { NOTION_STATE_COOKIE: "cd_notion_oauth", verifyNotionOAuthState: async () => null },
  });
  const response = await route.GET({ nextUrl: new URL("https://example.com/api/auth/notion/callback?code=attacker-code&state=attacker-analysis") });
  assert.match(response.location, /notion_error=invalid_state/);
});

test("Notion connection magic links cannot overwrite a different signed-in identity", async () => {
  const route = loadIsolated("web/src/app/api/auth/notion/connect/route.ts", {
    "next/server": { NextResponse: { redirect: (url: URL) => ({ location: url.href }) } },
    "@/lib/auth": { getSession: async () => ({ sub: "victim" }), verifyToken: async () => ({ sub: "attacker" }), setSessionCookie: () => { throw new Error("Cannot replace victim session"); } },
  });
  const response = await route.GET({ nextUrl: new URL("https://example.com/api/auth/notion/connect?token=attacker-token") });
  assert.match(response.location, /account_conflict/);
});

test("user profile response exposes connection status without credentials or future secret columns", async () => {
  const selections: string[] = [];
  const row = {
    id: "user-a", telegram_id: 123, telegram_username: "fixture", first_name: "Fixture",
    onboarded: true, premium: false, notion_workspace_name: "Fixture workspace", notion_database_id: "fixture-db",
    notion_access_token: "test-only-token", password_hash: "test-only-hash", stripe_customer_id: "test-only-customer", future_secret_column: "test-only-future-secret",
  };
  const route = loadIsolated("web/src/app/api/user/route.ts", {
    "next/server": { NextResponse: { json: (body: unknown) => body } },
    "@/lib/auth": { getSession: async () => ({ sub: "user-a" }) },
    "@/lib/chat-usage": { getChatUsage: async () => ({ used: 0 }) },
    "@/lib/supabase": { getSupabase: () => ({ from: (table: string) => {
      let head = false;
      const result = () => table === "users" ? head ? { count: 1 } : { data: row } : table === "credits" ? { data: { balance: 2, lifetime_used: 0 } } : { data: null, count: 0 };
      const query: any = {
        select(columns: string, options?: { head?: boolean }) { selections.push(columns); head = !!options?.head; return this; },
        eq() { return this; }, not() { return this; }, neq() { return this; },
        single: async () => result(),
        then(resolve: (value: unknown) => unknown) { return Promise.resolve(result()).then(resolve); },
      };
      return query;
    } }) },
  });
  const response = await route.GET();
  assert.equal(response.user.id, "user-a");
  assert.equal(response.user.notion_connected, true);
  assert.equal(response.user.notion_workspace_name, "Fixture workspace");
  for (const key of ["notion_access_token", "password_hash", "stripe_customer_id", "future_secret_column"]) {
    assert.equal(key in response.user, false, `${key} must not be serialized`);
  }
  assert.equal(selections.some(columns => columns.includes("*") || columns.includes("notion_access_token") || columns.includes("password_hash")), false);
  assert.ok(!JSON.stringify(response).includes("test-only-"));
});
