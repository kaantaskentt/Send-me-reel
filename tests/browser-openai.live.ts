/** Opt-in paid integration check: npx tsx tests/browser-openai.live.ts
 * Uses the configured OpenAI planner and a real Chromium instance against a
 * controlled local fixture. It never runs as part of npm test.
 */
import 'dotenv/config';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { AddressInfo } from 'node:net';
import { GuidedBrowserRun, createOpenAIPlanner, type BrowserState } from '../companion/browser.js';
import type { ReplicationPlan } from '../shared/execution-plan.js';

if (!process.env.OPENAI_API_KEY) throw new Error('Configure OPENAI_API_KEY before running the opt-in live check');
const fixture = http.createServer((_request, response) => {
  response.setHeader('Content-Type', 'text/html');
  response.end('<!doctype html><html><title>ContextDrop controlled preview fixture</title><body><h1>Preview generator</h1><p>Click Generate preview to display the local result.</p><button onclick="this.outerHTML=\'<h2 id=result>Preview ready</h2>\'">Generate preview</button></body></html>');
});
await new Promise<void>(resolve => fixture.listen(0, '127.0.0.1', resolve));
const fixtureUrl = `http://127.0.0.1:${(fixture.address() as AddressInfo).port}/`;
const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'contextdrop-openai-browser-smoke-'));
const plan: ReplicationPlan = {
  version: 1, analysisId: '00000000-0000-4000-8000-000000000001', sourceUrl: 'https://example.com/tutorial',
  title: 'Generate a local preview', mode: 'build', goal: 'On the controlled preview generator, click Generate preview, then finish only after observing Preview ready.',
  summary: 'A local integration fixture verifies a reviewed action and observed browser outcome.', prerequisites: [],
  steps: [{ id: 'step-1', instruction: 'Click Generate preview on the already open fixture.', evidenceIds: ['evidence-1'], kind: 'observed', verification: 'The page shows Preview ready.' }],
  evidence: [{ id: 'evidence-1', kind: 'article', text: 'The controlled fixture contains Generate preview, which creates Preview ready.', timestampSec: null }],
  warnings: [], successCriteria: ['Preview ready is visible in the actual browser.'],
};
const livePlanner = createOpenAIPlanner(plan, process.env.OPENAI_API_KEY);
let aiCalls = 0;
let state: BrowserState = { status: 'launching', history: [] };
const started = Date.now();
const run = new GuidedBrowserRun({ workspace, headless: process.env.BROWSER_LIVE_VISIBLE !== '1', onState: value => { state = value; },
  validateUrl: async value => { assert.equal(value, fixtureUrl, 'Only the local test fixture is authorized'); },
  resolveDestination: async value => {
    assert.equal(value, fixtureUrl, 'Only the local test fixture is authorized');
    return { url: new URL(value), addresses: [{ address: '127.0.0.1', family: 4 }] };
  },
  planner: async (observation, history) => {
    // The private fixture URL is injected by the harness; public-only production
    // validation is unchanged. Every page decision after bootstrap is real AI.
    if (observation.url === 'about:blank') return { type: 'navigate', description: 'Open the controlled test fixture', targetId: null, url: fixtureUrl, text: null };
    aiCalls++;
    return livePlanner(observation, history);
  },
});
try {
  await run.start();
  assert.equal(state.status, 'awaiting_approval', state.message);
  assert.equal(state.pendingAction?.type, 'navigate');
  await run.approve(state.pendingAction!.id, true);
  assert.equal(state.status, 'awaiting_approval', state.message);
  assert.equal(state.pendingAction?.type, 'click');
  const page = (run as any).page;
  const observedLabel = await page.locator(`[data-contextdrop-target="${state.pendingAction!.targetId}"]`).innerText();
  assert.equal(observedLabel, 'Generate preview');
  await fs.writeFile(path.join(workspace, 'proposed-action.jpg'), Buffer.from(state.screenshot!.split(',')[1]!, 'base64'));
  await run.approve(state.pendingAction!.id, true);
  assert.equal(state.status, 'finished_unverified', state.message);
  const result = await page.locator('#result').innerText();
  assert.equal(result, 'Preview ready');
  assert.equal(aiCalls, 2);
  const proof = { passed: true, model: process.env.COMPUTER_MODEL || 'gpt-5.4-mini', aiCalls, elapsedMs: Date.now() - started, observedResult: result, actions: state.history, workspace };
  await fs.writeFile(path.join(workspace, 'live-proof.json'), JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof));
} catch (error) {
  console.error(JSON.stringify({ passed: false, aiCalls, status: state.status, message: state.message, error: error instanceof Error ? error.message : 'Live browser check failed', actions: state.history, workspace }));
  process.exitCode = 1;
} finally {
  await run.stop(); fixture.closeAllConnections(); await new Promise<void>(resolve => fixture.close(() => resolve()));
}
