import test from "node:test";
import assert from "node:assert/strict";
import { normalizePublicRepositoryUrl, searchPublicRepositories, verifyPublicRepository } from "../src/lib/repository-resolver";
import type { RepositorySourceClue } from "../src/lib/repository-resolver";

const fixture = {
  name: "Agent-Reach", full_name: "Panniantong/Agent-Reach", owner: { login: "Panniantong" },
  html_url: "https://github.com/Panniantong/Agent-Reach", description: "Public agent tools", private: false,
  archived: false, default_branch: "main", license: { spdx_id: "MIT" },
};
const url = fixture.html_url;
const reply = (body: unknown = fixture, status = 200): typeof fetch => async () => Response.json(body, { status });

test("repository roots normalize while hostile hosts, credentials, ports and paths never trigger fetch", async () => {
  assert.equal(normalizePublicRepositoryUrl("https://www.github.com/Panniantong/Agent-Reach.git/"), url);
  let calls = 0;
  const fetcher: typeof fetch = async () => { calls++; return Response.json(fixture); };
  for (const input of ["http://github.com/a/b", "https://github.com.evil.test/a/b", "https://github.com@127.0.0.1/a/b", "https://user:pass@github.com/a/b", "https://github.com:9000/a/b", "https://127.0.0.1/a/b", "https://github.com/a/b/issues", "https://github.com/a/%2fb", "file:///tmp/repo", "https://github.com/a"]) {
    assert.equal((await verifyPublicRepository(input, [], { fetch: fetcher })).existence, "invalid", input);
  }
  assert.equal(calls, 0);
});

test("public requests use a fixed API origin without credentials and refuse redirects", async () => {
  const fetcher: typeof fetch = async (input, init) => {
    assert.equal(input, "https://api.github.com/repos/Panniantong/Agent-Reach");
    assert.equal(init?.credentials, "omit");
    assert.equal(init?.redirect, "error");
    assert.equal(init?.cache, "no-store");
    const headers = new Headers(init?.headers);
    assert.equal(headers.has("authorization"), false);
    assert.equal(headers.has("cookie"), false);
    assert.equal(headers.has("x-api-key"), false);
    return Response.json(fixture);
  };
  assert.equal((await verifyPublicRepository(url, [], { fetch: fetcher })).existence, "verified");
});

test("repository existence does not confirm source identity", async () => {
  const result = await verifyPublicRepository(url, [{ source: "transcript", text: "An agent that can search the internet" }], { fetch: reply() });
  assert.equal(result.existence, "verified");
  assert.equal(result.sourceMatch, "candidate");
  assert.deepEqual(result.matchedClues, []);
  assert.equal(result.repository?.license, "MIT");
});

test("exact observed URL or owner/name can confirm a source match and preserve the timestamp", async () => {
  for (const text of ["The URL is https://github.com/Panniantong/Agent-Reach/tree/main", "Repo: panniantong/agent-reach", "(github.com/Panniantong/Agent-Reach.git)"]) {
    const result = await verifyPublicRepository(url, [{ source: "visual", text, timestampSeconds: 37.5, frameId: "frame-38" }], { fetch: reply() });
    assert.equal(result.sourceMatch, "confirmed", text);
    assert.equal(result.matchedClues[0].timestampSeconds, 37.5);
  }
});

test("similar names, URL prefixes and invalid evidence do not falsely confirm", async () => {
  for (const text of ["https://github.com/Panniantong/Agent-Reach-Fake", "https://github.com/Panniantong/Agent-Reach.fake", "Panniantong/Agent-Reach.fake", "https://evil.test/Panniantong/Agent-Reach", "https://fake.github.com/Panniantong/Agent-Reach", "https://github.com.evil.test/Panniantong/Agent-Reach", "Agent-Reach"]) {
    assert.equal((await verifyPublicRepository(url, [{ source: "visual", text }], { fetch: reply() })).sourceMatch, "candidate", text);
  }
  assert.equal((await verifyPublicRepository(url, [{ source: "visual", text: url, timestampSeconds: -1 }], { fetch: reply() })).sourceMatch, "candidate");
});

test("repository clues in later frames and after the frame list remain searchable", async () => {
  const frames: RepositorySourceClue[] = Array.from({ length: 95 }, (_, index) => ({ source: "visual", text: index === 50 ? url : "A different webpage is visible.", timestampSeconds: index * 5 }));
  const frameResult = await verifyPublicRepository(url, frames, { fetch: reply() });
  assert.equal(frameResult.sourceMatch, "confirmed");
  assert.equal(frameResult.matchedClues[0].timestampSeconds, 250);
  frames[50].text = "A different webpage is visible.";
  const captionResult = await verifyPublicRepository(url, [...frames, { source: "caption", text: `Creator's repository: ${url}` }], { fetch: reply() });
  assert.equal(captionResult.sourceMatch, "confirmed");
  assert.equal(captionResult.matchedClues[0].source, "caption");
});

test("long transcripts retain late identity clues but return bounded excerpts", async () => {
  const text = `${"A speaker discusses an AI workflow. ".repeat(3_000)} Repository: ${url}`;
  assert.ok(text.length > 100_000);
  const result = await verifyPublicRepository(url, [{ source: "transcript", text }], { fetch: reply() });
  assert.equal(result.sourceMatch, "confirmed");
  assert.ok(result.matchedClues[0].text.length < 500);
  assert.equal(result.matchedClues[0].timestampSeconds, undefined);
  const beyondBudget = await verifyPublicRepository(url, [{ source: "transcript", text: `${"x".repeat(2_000_001)} ${url}` }], { fetch: reply() });
  assert.equal(beyondBudget.sourceMatch, "candidate");
});

test("unexpected identity, private response and untrusted canonical URLs are rejected", async () => {
  for (const fixtureOverride of [{ full_name: "other/repo" }, { html_url: "https://evil.test/Panniantong/Agent-Reach" }, { private: true }, { owner: { login: "../../local" } }, { default_branch: null }]) {
    const result = await verifyPublicRepository(url, [{ source: "visual", text: url }], { fetch: reply({ ...fixture, ...fixtureOverride }) });
    assert.equal(result.existence, "unavailable");
    assert.equal(result.sourceMatch, "unknown");
    assert.equal(result.repository, null);
  }
});

test("not-found, rate-limited and redirected responses remain distinct from confirmation", async () => {
  for (const status of [301, 403, 404, 429, 500]) {
    const result = await verifyPublicRepository(url, [], { fetch: reply({}, status) });
    assert.equal(result.existence, status === 404 ? "not_found" : "unavailable");
    assert.equal(result.sourceMatch, "unknown");
  }
});

test("body limits apply even when Content-Length lies or is absent", async () => {
  const headerCases: Record<string, string>[] = [{ "content-type": "application/json" }, { "content-type": "application/json", "content-length": "1" }, { "content-type": "application/json", "content-length": "1000000" }];
  for (const headers of headerCases) {
    const fetcher: typeof fetch = async () => new Response(JSON.stringify({ ...fixture, padding: "x".repeat(65_000) }), { headers });
    assert.equal((await verifyPublicRepository(url, [], { fetch: fetcher })).existence, "unavailable");
  }
});

test("timeouts cover unresponsive requests and stalled response bodies", async () => {
  const stalledRequest: typeof fetch = () => new Promise(() => {});
  assert.equal((await verifyPublicRepository(url, [], { fetch: stalledRequest, timeoutMs: 5 })).existence, "unavailable");
  const stalledBody: typeof fetch = async () => new Response(new ReadableStream({ start() {} }), { headers: { "content-type": "application/json" } });
  assert.equal((await verifyPublicRepository(url, [], { fetch: stalledBody, timeoutMs: 5 })).existence, "unavailable");
});

test("malformed JSON and non-JSON responses fail closed without exposing response text", async () => {
  for (const contentType of ["application/json", "text/html"]) {
    const fetcher: typeof fetch = async () => new Response("unexpected server message", { headers: { "content-type": contentType } });
    const result = await verifyPublicRepository(url, [], { fetch: fetcher });
    assert.equal(result.existence, "unavailable");
    assert.equal(result.reason.includes("unexpected server message"), false);
  }
});

test("search is bounded, public and returns candidates without claiming source matches", async () => {
  const fetcher: typeof fetch = async (input) => {
    const request = new URL(String(input));
    assert.equal(request.origin, "https://api.github.com");
    assert.equal(request.pathname, "/search/repositories");
    assert.equal(request.searchParams.get("per_page"), "5");
    assert.equal(request.searchParams.get("q"), '"Agent-Reach" in:name,description,readme is:public');
    return Response.json({ items: [fixture, { ...fixture, private: true }, ...Array(6).fill(fixture)] });
  };
  const result = await searchPublicRepositories("Agent-Reach", { fetch: fetcher });
  assert.equal(result.status, "ok");
  assert.equal(result.candidates.length, 4);
  assert.equal("sourceMatch" in result.candidates[0], false);
});

test("search rejects huge/empty clues and strips arbitrary query operators", async () => {
  const unexpectedFetch: typeof fetch = async () => { throw new Error("Should not fetch"); };
  for (const clue of ["", "x", "x".repeat(161), "a\nb"]) assert.equal((await searchPublicRepositories(clue, { fetch: unexpectedFetch })).status, "invalid");
  const fetcher: typeof fetch = async (input) => {
    const query = new URL(String(input)).searchParams.get("q")!;
    assert.equal(query.includes("user:someone"), false);
    assert.equal(query.endsWith("is:public"), true);
    return Response.json({ items: [] });
  };
  assert.equal((await searchPublicRepositories("Agent-Reach user:someone", { fetch: fetcher })).status, "ok");
});

test("conflicting owner identities remain candidates even when one public repository exists", async () => {
  const result = await verifyPublicRepository(url, [
    { source:"visual", text: url, timestampSeconds: 10 },
    { source:"visual", text:"GitHub: https://github.com/OtherOwner/Agent-Reach", timestampSeconds: 100 },
  ], {fetch:reply()});
  assert.equal(result.existence,"verified");
  assert.equal(result.sourceMatch,"candidate");
  assert.deepEqual(result.conflictingIdentities,["OtherOwner/Agent-Reach"]);
  assert.match(result.reason,/different owners/);
  const unrelated = await verifyPublicRepository(url,[{source:"visual",text:`${url} and https://github.com/OtherOwner/unrelated`}],{fetch:reply()});
  assert.equal(unrelated.sourceMatch,"confirmed");
});

test("uncertain visual OCR never becomes a confirmed repository identity", async () => {
  const result=await verifyPublicRepository(url,[{source:"visual",text:url,uncertain:true}],{fetch:reply()});
  assert.equal(result.sourceMatch,"candidate");
  assert.equal(result.matchedClues[0].uncertain,true);
});
