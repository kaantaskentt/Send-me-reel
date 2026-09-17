import test from "node:test";
import assert from "node:assert/strict";
import { claimLocalLinkHandoff, contentLink, isPersonalLanding, linkLoginDestination, localLinkDestination, parseLocalLinkHandoff, sameContentLink, LOCAL_LINK_HANDOFF_KEY } from "../src/lib/link-handoff";
import { pendingShareRedirect } from "../src/lib/google-auth";
import { isLocalStudioRequest } from "../src/lib/local-studio";

const id = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const url = "https://www.instagram.com/reel/example/?igsh=shared";
const now = 1_000_000;
function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

test("public local landing can be opened from another site while private routes keep their origin gate", () => {
  const env: NodeJS.ProcessEnv = { NODE_ENV: "development", CONTEXTDROP_LOCAL_STUDIO: "1" };
  const headers = new Headers({ host: "127.0.0.1:3127", "sec-fetch-site": "cross-site", origin: "https://contextdrop.ai" });
  assert.equal(isPersonalLanding(headers, env), true);
  assert.equal(isLocalStudioRequest(headers, false, env), false);
  assert.equal(isLocalStudioRequest(headers, true, env), false);
  assert.equal(isPersonalLanding(headers, { ...env, NODE_ENV: "production" }), false);
  assert.equal(isPersonalLanding(headers, { NODE_ENV: "development" }), false);
  assert.equal(isPersonalLanding(new Headers({ host: "contextdrop.ai" }), env), false);
});

test("only complete public HTTP(S) links can leave the landing; HTTP is upgraded for the reader", () => {
  for (const invalid of ["", "youtube.com", "https://", "https://www.", "https://example.c", "some text https://example.com", "https://example.com trailing", "javascript:alert(1)", "file:///tmp/readme", "ftp://example.com", "https://localhost", "http://127.0.0.1", "https://10.0.0.1", "https://[::1]", "https://app.internal", "https://x.local", "https://user:password@example.com", "https://example.com:444", [url], "https://example.com/" + "a".repeat(2048)]) assert.equal(contentLink(invalid), null, String(invalid));
  assert.equal(contentLink(`  ${url}  `), url);
  assert.equal(contentLink("http://example.com/article?q=one#two"), "https://example.com/article?q=one#two");
});

test("the local handoff is bound to the exact clicked link and claimed only once across mounts", () => {
  const session = storage();
  const destination = new URL(localLinkDestination(url, session, id, now), "http://localhost");
  assert.equal(destination.pathname, "/replicate/local");
  const handoff = parseLocalLinkHandoff(destination.searchParams.get("link"), destination.searchParams.get("handoff"))!;
  assert.deepEqual(handoff, { id, url });
  assert.equal(claimLocalLinkHandoff({ ...handoff, url: "https://other.example/" }, session, now), false);
  assert.equal(claimLocalLinkHandoff(handoff, session, now), true);
  assert.equal(claimLocalLinkHandoff(handoff, session, now), false);
  assert.equal(claimLocalLinkHandoff(handoff, session, now + 1), false);
});

test("a URL alone, expired handoff, malformed storage, or unavailable storage never auto-starts capture", () => {
  const handoff = { id, url };
  const session = storage();
  assert.equal(claimLocalLinkHandoff(handoff, session, now), false);
  localLinkDestination(url, session, id, now);
  assert.equal(claimLocalLinkHandoff(handoff, session, now + 600_001), false);
  session.setItem(LOCAL_LINK_HANDOFF_KEY, "{broken");
  assert.equal(claimLocalLinkHandoff(handoff, session, now), false);
  const destination = new URL(localLinkDestination(url, null, id, now), "http://localhost");
  assert.equal(destination.searchParams.get("link"), url);
  assert.equal(destination.searchParams.has("handoff"), false);
  assert.equal(parseLocalLinkHandoff(url, [id]), null);
  assert.equal(parseLocalLinkHandoff(url, "not-a-handoff"), null);
});

test("YouTube aliases match their accepted capture URL without matching a different source", () => {
  assert.equal(sameContentLink("https://youtu.be/o3IEkKXXXvo?t=2", "https://www.youtube.com/watch?v=o3IEkKXXXvo"), true);
  assert.equal(sameContentLink("https://www.youtube.com/shorts/o3IEkKXXXvo", "https://www.youtube.com/watch?v=o3IEkKXXXvo"), true);
  assert.equal(sameContentLink("https://www.youtube.com/watch?v=o3IEkKXXXvo", "https://www.youtube.com/watch?v=abcdefghijk"), false);
  assert.equal(sameContentLink(url, "https://www.instagram.com/reel/different/"), false);
  assert.equal(sameContentLink("https://example.com/first", "https://example.com/second"), false);
});

test("GitHub repository canonicalization keeps the requested result visible without folding file paths", () => {
  const canonical = "https://github.com/Panniantong/Agent-Reach";
  for (const alias of ["https://github.com/Panniantong/agent-reach", "https://github.com/panniantong/AGENT-REACH/", "https://github.com/Panniantong/agent-reach.git", "https://www.github.com/Panniantong/agent-reach?utm_source=share"]) assert.equal(sameContentLink(alias, canonical), true);
  assert.equal(sameContentLink("https://github.com/Panniantong/other-repo", canonical), false);
  assert.equal(sameContentLink("https://github.com/example/project/blob/main/Readme.md", "https://github.com/example/project/blob/main/README.md"), false);
  assert.equal(sameContentLink("https://example.com/SomePage", "https://example.com/somepage"), false);
});

test("hosted login preserves the full link for the existing share flow without an external redirect", () => {
  const destination = new URL(linkLoginDestination(url), "https://contextdrop.ai");
  assert.equal(destination.pathname, "/login");
  assert.equal(destination.searchParams.get("next"), "/share");
  assert.equal(destination.searchParams.get("url"), url);
  assert.equal(pendingShareRedirect(encodeURIComponent(destination.searchParams.get("url")!)), `/share?url=${encodeURIComponent(url)}`);
  assert.throws(() => linkLoginDestination("javascript:alert(1)"));
});
