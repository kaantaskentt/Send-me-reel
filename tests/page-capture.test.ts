import test from "node:test";
import assert from "node:assert/strict";
import { lookup as dnsLookup } from "node:dns/promises";
import { capturePublicPage, MAX_PAGE_RESPONSE_BYTES, MAX_PAGE_TEXT_CHARACTERS, validatePublicPageUrl } from "../scripts/lib/page-capture.js";
import { pageCaptureOptions } from "../scripts/capture-page.js";

const publicLookup = (async () => [{ address: "93.184.216.34", family: 4 }]) as unknown as typeof dnsLookup;
const repo = { name: "example", full_name: "owner/example", owner: { login: "owner" }, html_url: "https://github.com/owner/example", private: false, description: "Example AI repository", archived: false, default_branch: "main", license: { spdx_id: "MIT" } };
const readme = "# Example AI repository\n\nThis is a public README for a small example agent.";

test("page URL validation rejects local addresses, mixed public/private DNS, credentials and ports", async () => {
  for (const url of ["http://example.com", "https://localhost", "https://127.0.0.1", "https://192.168.1.2", "https://[::1]", "https://host.local", "https://host.internal", "https://user:secret@example.com", "https://example.com:444", "file:///etc/passwd"]) {
    await assert.rejects(validatePublicPageUrl(url, publicLookup), { code: "PAGE_URL_INVALID" });
  }
  const mixedLookup = (async () => [{ address: "93.184.216.34", family: 4 }, { address: "10.0.0.1", family: 4 }]) as unknown as typeof dnsLookup;
  await assert.rejects(validatePublicPageUrl("https://public.example.com", mixedLookup), { code: "PAGE_URL_INVALID" });
  assert.equal((await validatePublicPageUrl("https://example.com/article#section", publicLookup)).href, "https://example.com/article");
});

test("GitHub capture uses only fixed public API endpoints and returns README evidence, never video evidence", async () => {
  const requests: string[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input); requests.push(url);
    assert.equal(new URL(url).origin, "https://api.github.com");
    assert.equal(new Headers(init?.headers).has("authorization"), false);
    assert.equal(new Headers(init?.headers).has("cookie"), false);
    assert.equal(init?.redirect, "error");
    return Response.json(url.includes("/readme?") ? { encoding: "base64", content: Buffer.from(readme).toString("base64") } : repo);
  };
  const result = await capturePublicPage(repo.html_url, { lookup: publicLookup, fetch: fetcher });
  assert.equal(requests.length, 2);
  assert.equal(result.mediaKind, "repository");
  assert.equal(result.coverage, "readme");
  assert.equal(result.text, readme);
  assert.equal(result.repository?.fullName, "owner/example");
  assert.match(result.warnings[0], /not executed/);
});

test("ordinary websites go through the fixed reader boundary without local source fetches", async () => {
  const fetcher: typeof fetch = async (input, init) => {
    assert.equal(String(input), "https://r.jina.ai/https://example.com/article");
    assert.equal(init?.credentials, "omit");
    assert.equal(new Headers(init?.headers).has("authorization"), false);
    return Response.json({ code: 200, data: { title: "An AI skill", url: "https://example.com/article", content: "A useful public article that explains how this AI skill works." } });
  };
  const result = await capturePublicPage("https://example.com/article", { lookup: publicLookup, fetch: fetcher });
  assert.equal(result.mediaKind, "article");
  assert.equal(result.title, "An AI skill");
  assert.equal(result.coverage, "reader_extract");
  assert.match(result.warnings[0], /Images, interactive behavior/);
});

test("reader results reporting local destinations fail closed", async () => {
  const fetcher: typeof fetch = async () => Response.json({ code: 200, data: { url: "https://localhost/private", title: "Private", content: "Do not admit a non-public redirect as public evidence." } });
  await assert.rejects(capturePublicPage("https://example.com/article", { lookup: publicLookup, fetch: fetcher }), { code: "PAGE_URL_INVALID" });
});

test("captured text truncation is explicit and large responses stop before parsing", async () => {
  const longText = "x".repeat(MAX_PAGE_TEXT_CHARACTERS + 1);
  const fetcher: typeof fetch = async () => Response.json({ code: 200, data: { title: "Long", content: longText } });
  const result = await capturePublicPage("https://example.com/article", { lookup: publicLookup, fetch: fetcher });
  assert.equal(result.truncated, true);
  assert.equal(result.text.length, MAX_PAGE_TEXT_CHARACTERS);
  assert.match(result.warnings.join(" "), /Only the first/);
  const oversized: typeof fetch = async () => new Response("x".repeat(MAX_PAGE_RESPONSE_BYTES + 1), { headers: { "content-type": "application/json", "content-length": "1" } });
  await assert.rejects(capturePublicPage("https://example.com/article", { lookup: publicLookup, fetch: oversized }), { code: "PAGE_CONTENT_TOO_LARGE" });
});

test("empty, blocked, malformed and redirected pages return coded failures", async () => {
  const responses = [Response.json({ code: 200, data: { content: "" } }), Response.json({ code: 403, data: { content: "Private page cannot be read with the public reader." } }), new Response("oops", { headers: { "content-type": "application/json" } }), Response.json({}, { status: 302 })];
  for (const response of responses) {
    await assert.rejects(capturePublicPage("https://example.com/article", { lookup: publicLookup, fetch: async () => response }), (error: unknown) => error instanceof Error && "code" in error && ["PAGE_EMPTY", "PAGE_FETCH_FAILED"].includes(String(error.code)));
  }
});

test("page deadline covers a stalled reader and never exposes raw provider errors", async () => {
  await assert.rejects(capturePublicPage("https://example.com/article", { lookup: publicLookup, fetch: () => new Promise(() => {}), timeoutMs: 5 }), { code: "CAPTURE_TIMEOUT" });
  await assert.rejects(capturePublicPage("https://example.com/article", { lookup: publicLookup, fetch: async () => { throw new Error("secret=do-not-display"); } }), (error: unknown) => error instanceof Error && !error.message.includes("do-not-display"));
});

test("page CLI arguments are bounded and do not accept unknown switches", () => {
  assert.equal(pageCaptureOptions(["https://example.com", "--timeout-seconds", "90"])?.timeoutSeconds, 90);
  for (const args of [["https://example.com", "--timeout-seconds", "91"], ["https://example.com", "--timeout-seconds", "NaN"], ["https://example.com", "--output"], ["https://example.com", "--shell", "anything"]]) assert.throws(() => pageCaptureOptions(args));
  assert.equal(pageCaptureOptions(["--help"]), null);
});
