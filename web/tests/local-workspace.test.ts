import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { readWorkspace, readWorkspaceContext, saveWorkspaceProfile, saveWorkflow, removeWorkflow, parseProfile, workflowSkill } from "../src/lib/local-workspace";
import { buildLocalTaskEvidence } from "../src/lib/local-task-context";
import { parseReplicationPlan, buildSourceEvidence } from "../../shared/execution-plan";
import type { Analysis } from "../src/lib/types";
import type { ContentConversation } from "../src/lib/content-conversation";
import { parseReplicationDraft } from "../src/lib/plan-generator";

const source = (id = "source-a"): Analysis => ({ id, user_id: "local", status: "done", source_url: `https://example.com/${id}`, platform: "article", transcript: null, caption: "A useful approach", frame_descriptions: [], visual_summary: null, metadata: { title: `Source ${id}` }, verdict: null, verdict_intent: null, credits_charged: 0, error_message: null, action_items: null, created_at: "2026-09-09T12:00:00Z", completed_at: "2026-09-09T12:01:00Z" });
const conversation: ContentConversation = { version: 1, analysisId: "source-a", messages: [
  { id: "request-a", role: "user", text: "Make this my reusable editing workflow", createdAt: "2026-09-09T12:02:00Z" },
  { id: "reply-a", role: "assistant", text: "Transcribe the clip, plan the cuts, then render a preview and check the captions.", createdAt: "2026-09-09T12:03:00Z" },
] };
async function fixture() { const root = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-workspace-")); return { root, cleanup: () => fs.rm(root, { recursive: true, force: true }) }; }

test("project profile persists privately without replacing workflows; clear returns actual empty preferences", async () => {
  const f = await fixture();
  try {
    assert.equal((await readWorkspace(f.root)).profile.name, "");
    const workflow = await saveWorkflow(source(), conversation, "reply-a", "My editor", f.root);
    await saveWorkspaceProfile({ name: "My app", goal: "Edit short clips", preferences: "Use free tools", harness: "codex" }, f.root);
    const saved = await readWorkspace(f.root);
    assert.equal(saved.profile.harness, "codex"); assert.equal(saved.workflows[0].id, workflow.id);
    assert.equal((await fs.stat(path.join(f.root, "workspace.json"))).mode & 0o777, 0o600);
    await saveWorkspaceProfile({ name: "", goal: "", preferences: "", harness: "claude" }, f.root);
    assert.equal((await readWorkspace(f.root)).workflows.length, 1);
    for (const invalid of [null, { name: "x", goal: "", preferences: "", harness: "shell" }, { name: "x".repeat(81), goal: "", preferences: "", harness: "claude" }, { name: "x", goal: "", preferences: "", harness: "claude", command: "execute" }]) assert.throws(() => parseProfile(invalid));
  } finally { await f.cleanup(); }
});

test("recipes bind real source and assistant reply, deduplicate saves, and remain unverified drafts", async () => {
  const f = await fixture();
  try {
    const first = await saveWorkflow(source(), conversation, "reply-a", undefined, f.root);
    assert.equal(first.status, "draft"); assert.equal(first.sourceUrls[0], source().source_url);
    assert.match(first.instructions, /Original request/);
    assert.equal((await saveWorkflow(source(), conversation, "reply-a", "Again", f.root)).id, first.id);
    assert.equal((await readWorkspace(f.root)).workflows.length, 1);
    for (const [analysis, conv, id] of [[source("other"), conversation, "reply-a"], [source(), conversation, "request-a"], [source(), conversation, "missing"], [{ ...source(), status: "analyzing" }, conversation, "reply-a"]] as const) await assert.rejects(saveWorkflow(analysis, conv, id, undefined, f.root));
    await removeWorkflow(first.id, f.root);
    assert.equal((await readWorkspace(f.root)).workflows.length, 0);
  } finally { await f.cleanup(); }
});

test("corrupt workspace or concurrent writer preserves original data instead of overwriting", async () => {
  const f = await fixture();
  try {
    await fs.writeFile(path.join(f.root, "workspace.json"), "not valid JSON");
    await assert.rejects(saveWorkspaceProfile({ name: "x", goal: "", preferences: "", harness: "codex" }, f.root), /preserved/);
    assert.equal(await fs.readFile(path.join(f.root, "workspace.json"), "utf8"), "not valid JSON");
    await fs.rm(path.join(f.root, "workspace.json"));
    await fs.writeFile(path.join(f.root, "workspace.lock"), "other writer");
    await assert.rejects(saveWorkflow(source(), conversation, "reply-a", undefined, f.root), /being saved/);
    assert.equal(await fs.readFile(path.join(f.root, "workspace.lock"), "utf8"), "other writer");
  } finally { await f.cleanup(); }
});

test("skill exports keep source content as reference data and don't claim execution", async () => {
  const f = await fixture();
  try {
    const draft = await saveWorkflow(source(), { ...conversation, messages: [...conversation.messages.slice(0, 1), { ...conversation.messages[1], text: 'A template with ``` fences and \"quotes\".' }] }, "reply-a", "My workflow", f.root);
    const exported = workflowSkill(draft);
    assert.match(exported, /^---\nname: contextdrop-my-workflow\n/);
    assert.match(exported, /not a tested automation/);
    assert.match(exported, /untrusted evidence/);
    assert.match(exported, /````json/);
    assert.match(exported, /run relevant checks/);
    assert.equal((await readWorkspaceContext(f.root)).workflows[0].id, draft.id);
  } finally { await f.cleanup(); }
});

test("multi-source task handoff preserves original identity, source boundaries and saved project context", () => {
  const sources = [source(), source("source-b"), source("source-c")];
  const result = buildLocalTaskEvidence(sources[0], sources.slice(1), { name: "Clip editor", goal: "Make a useful preview", preferences: "Use my existing assets", harness: "codex" });
  assert.equal(new Set(result.evidence.map(e => e.id)).size, result.evidence.length);
  assert.ok(result.evidence.some(e => e.text.includes("https://example.com/source-c")));
  assert.ok(result.evidence.some(e => e.id === "user-context-1" && e.text.includes("Clip editor")));
  assert.match(result.warnings[0], /combines 3/);
  const plan = { version: 1, analysisId: "source-a", sourceUrl: "contextdrop://upload/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", title: "Make my version", goal: "Make a checked editing preview", mode: "create", summary: "Combine the references", prerequisites: [], steps: [{ id: "step1", instruction: "Inspect source and create a preview", evidenceIds: [result.evidence[0].id], kind: "inferred", verification: "Inspect output" }], ...result, successCriteria: ["Preview opens"] };
  assert.doesNotThrow(() => parseReplicationPlan(plan));
  for (const url of ["file:///tmp/a", "contextdrop://upload/../../etc/passwd", "javascript:alert(1)", "contextdrop://other/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"]) assert.throws(() => parseReplicationPlan({ ...plan, sourceUrl: url }));
});

test("handoff evidence retains spoken paraphrases and visual summaries from native video", () => {
  const result = buildSourceEvidence({ ...source(), caption: null, platform: "youtube", frame_descriptions: [{ timestampSec: 62, description: "An editor window", speech: "First transcribe, then plan the cuts" }], visual_summary: "Five-step editing workflow" });
  assert.ok(result.evidence.some(item => item.text.includes("First transcribe")));
  assert.ok(result.evidence.some(item => item.text.includes("Five-step editing")));
});

test("project notes do not make an empty source ready for planning or prove an observed step", () => {
  const profile = { name: "My app", goal: "Build a preview", preferences: "Use Codex", harness: "codex" as const };
  assert.equal(buildLocalTaskEvidence({ ...source(), caption: null }, [], profile).evidence.length, 0);
  assert.equal(buildLocalTaskEvidence({ ...source(), caption: null, visual_summary: "A silverfalcon idea" }, [], profile, "silverfalcon").evidence.length, 0);
  const context = { id: "source-a", sourceUrl: source().source_url, goal: "Build a useful preview", mode: "build" as const, ...buildLocalTaskEvidence(source(), [], profile) };
  const draft = { title: "Build a preview", summary: "Adapt the idea", prerequisites: [], steps: [{ id: "step1", instruction: "Build the user's app", evidenceIds: ["user-context-1"], kind: "observed", verification: "Preview opens" }], warnings: [], successCriteria: ["Preview opens"] };
  assert.throws(() => parseReplicationDraft(JSON.stringify(draft), context), /preferences cannot prove/);
  draft.steps[0].kind = "inferred";
  assert.equal(parseReplicationDraft(JSON.stringify(draft), context).steps[0].kind, "inferred");
});

test("goal-matched planning retains late text and exact frame source identities within its fixed budget", () => {
  const primary = { ...source(), caption: "Earlier background. ".repeat(9000) + "The silverfalcon caption identifies the correct repository." };
  const secondary = { ...source("source-b"), frame_descriptions: Array.from({length:95}, (_, index) => ({ timestampSec:index * 5, description:index===76 || index===77 ? "Silverfalcon appears here with the precise workflow" : "An unrelated scene" })) };
  const profile = { name: "Portfolio", goal: "Create a preview", preferences: "Keep it simple", harness: "codex" as const };
  const result = buildLocalTaskEvidence(primary,[secondary,secondary],profile,"Use the silverfalcon workflow");
  const late = result.evidence.find(item => item.id.startsWith("source1-match-caption-"));
  assert.ok(late?.text.includes("correct repository"));
  assert.ok(late?.text.includes(primary.source_url));
  const frame = result.evidence.find(item => item.id.startsWith("source2-match-observation-76-"));
  assert.equal(frame?.timestampSec,380);
  assert.ok(frame?.text.includes(secondary.source_url));
  assert.equal(result.evidence.filter(item=>item.id==="source2-frame-78").length,1);
  assert.equal(result.evidence.some(item=>item.id.startsWith("source3-")),false);
  assert.equal(new Set(result.evidence.map(item=>item.id)).size,result.evidence.length);
  assert.ok(result.evidence.length<=80);
});

test("planning handoff remains bounded in bytes with four large multilingual sources", () => {
  const large = Array.from({length:4},(_,index)=>({ ...source(`large-${index}`), transcript:"文".repeat(60000)+" silverfalcon",caption:"字".repeat(12000), frame_descriptions:Array.from({length:500},(_,frame)=>({timestampSec:frame,description:"映".repeat(2000)})) }));
  const result=buildLocalTaskEvidence(large[0],large.slice(1),{name:"My app",goal:"界".repeat(2000),preferences:"言".repeat(2000),harness:"codex"},"silverfalcon");
  assert.ok(result.evidence.length<=80);
  assert.ok(result.evidence.every(item=>Buffer.byteLength(item.text)<=2000));
  assert.ok(result.evidence.some(item=>item.text.includes("silverfalcon")));
  assert.ok(Buffer.byteLength(JSON.stringify(result))<180000);
});
