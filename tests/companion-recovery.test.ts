import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { createCompanionServer, type CompanionOptions } from '../companion/server.js';
import type { ReplicationPlan } from '../shared/execution-plan.js';

const token = 'fixture-only-companion-recovery-token-0001';
const headers = { Authorization: `Bearer ${token}`, Origin: 'http://localhost:3000', 'Content-Type': 'application/json' };
const plan: ReplicationPlan = { version: 1, analysisId: 'recovery-source', sourceUrl: 'https://example.com/source', title: 'A recoverable local task', goal: 'Build a fixture result', mode: 'build', summary: 'Controlled fixture, no provider calls.', prerequisites: [], steps: [{ id: 'step1', instruction: 'Create a fixture file', evidenceIds: ['frame1'], kind: 'observed', verification: 'Read the fixture file' }], evidence: [{ id: 'frame1', kind: 'frame', text: 'A visible fixture file', timestampSec: 2 }], warnings: [], successCriteria: ['Fixture file exists'] };

async function start(rootDir: string, extra: Partial<CompanionOptions> = {}) {
  const server = createCompanionServer({ token, allowedOrigins: ['http://localhost:3000'], rootDir, platform: 'darwin', codexBinary: '/usr/bin/true', terminalMode: 'exec', launchTerminal: async () => {}, launchRunner: async () => {}, inspectSetup: async () => ({ version: 1, checkedAt: new Date().toISOString(), connections: [], harnesses: Object.fromEntries(['codex', 'claude'].map(id => [id, { installed: true, supported: true, version: 'fixture', auth: 'authenticated', authEvidence: 'native_cli_status', reason: null, mode: id === 'codex' ? 'exec' : 'interactive', available: true, unavailableReason: null }])) } as import('../companion/connections.js').SetupStatus), ...extra });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { base, close: async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); } };
}
async function launch(base: string, key = 'recover-request-001', harness: 'codex' | 'claude' = 'codex') {
  const response = await fetch(`${base}/runs`, { method: 'POST', headers: { ...headers, 'Idempotency-Key': key }, body: JSON.stringify({ plan, executor: 'terminal', harness }) });
  assert.ok(response.ok, await response.clone().text());
  return response.json();
}
async function eventually(check: () => Promise<boolean>) {
  const deadline = Date.now() + 10_000;
  while (!await check()) {
    if (Date.now() > deadline) throw new Error('Expected task state did not arrive');
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

test('saved task discovery retains source identity, output and idempotency across companion restart', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'contextdrop-recovery-'));
  let launches = 0;
  let service = await start(root, { launchRunner: async () => { launches++; } });
  try {
    const run = await launch(service.base);
    assert.equal((await fetch(`${service.base}/runs`)).status, 401);
    const control = path.join(root, run.id, 'control');
    await fs.writeFile(path.join(control, 'status.json'), JSON.stringify({ id: run.id, status: 'finished_unverified', updatedAt: new Date().toISOString(), workspace: '/arbitrary/untrusted/path' }));
    await fs.writeFile(path.join(control, 'last-message.md'), 'Agent message fallback');
    await fs.writeFile(path.join(run.workspace, 'CONTEXTDROP-RESULT.md'), '# Result\nFixture file created. Review the actual output.');
    await service.close();
    service = await start(root, { launchRunner: async () => { launches++; } });
    const history = await (await fetch(`${service.base}/runs`, { headers })).json();
    assert.equal(history.runs.length, 1);
    assert.equal(history.runs[0].id, run.id);
    assert.equal(history.runs[0].analysisId, plan.analysisId);
    assert.equal(history.runs[0].title, plan.title);
    assert.equal(history.runs[0].executor, 'terminal');
    assert.equal(history.runs[0].terminalMode, 'exec');
    assert.equal(history.runs[0].status, 'finished_unverified');
    assert.equal(history.runs[0].workspace, run.workspace);
    assert.equal(history.runs[0].canStop, false);
    assert.equal(history.runs[0].canResume, false);
    assert.equal((await launch(service.base)).id, run.id);
    assert.equal(launches, 1, 'Retry after service restart must not start another coding agent');
    const output = await (await fetch(`${service.base}/runs/${run.id}/output`, { headers })).json();
    assert.equal(output.mode, 'streaming');
    assert.equal(output.result.source, 'report');
    assert.equal(output.result.verification, 'unverified');
    assert.match(output.result.text, /Fixture file created/);
    assert.equal((await fetch(`${service.base}/runs/${randomUUID()}/output`, { headers })).status, 404);
  } finally { await service.close(); await fs.rm(root, { recursive: true, force: true }); }
});

test('background Codex starts without Terminal, survives service restart, streams output, and acknowledges stop', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'contextdrop-runner-recovery-'));
  const binary = path.join(root, 'fixture-codex.mjs');
  await fs.writeFile(binary, `#!${process.execPath}\nconsole.log(JSON.stringify({type:'item.started',item:{type:'command_execution',command:'fixture-only command'}}));\nconsole.log(JSON.stringify({type:'item.completed',item:{type:'command_execution',aggregated_output:'Fixture runner is alive',exit_code:0}}));\nprocess.on('SIGTERM',()=>process.exit(0));setInterval(()=>{},1000);\n`, { mode: 0o700 });
  let runId: string | undefined;
  let terminalLaunches = 0;
  let service = await start(root, { codexBinary: binary, launchRunner: undefined, launchTerminal: async () => { terminalLaunches++; throw new Error('Terminal cannot open'); } });
  try {
    const run = await launch(service.base);
    runId = run.id;
    assert.equal(run.status, 'running', 'Starting is acknowledged only after a runner status handshake');
    assert.equal(terminalLaunches, 0);
    await assert.rejects(fs.access(path.join(root, run.id, 'control', 'Build with ContextDrop.command')));
    const state = async () => (await fetch(`${service.base}/runs/${run.id}`, { headers })).json();
    await eventually(async () => (await state()).status === 'running');
    await eventually(async () => (await (await fetch(`${service.base}/runs/${run.id}/output`, { headers })).json()).log.text.includes('Fixture runner is alive'));
    await service.close();
    service = await start(root);
    assert.equal((await state()).status, 'running');
    assert.equal((await state()).analysisId, plan.analysisId);
    const stop = await fetch(`${service.base}/runs/${run.id}/stop`, { method: 'POST', headers, body: '{}' });
    assert.equal(stop.status, 202);
    assert.equal((await stop.json()).status, 'stopping');
    await eventually(async () => (await state()).status === 'stopped');
    assert.equal((await state()).canStop, false);
    const next = await launch(service.base, 'recover-request-002');
    assert.notEqual(next.id, run.id, 'A stopped task must not block the next reviewed task');
  } finally {
    if (runId) {
      await fs.writeFile(path.join(root, runId, 'control', 'stop-request.json'), JSON.stringify({ id: runId }));
      await eventually(async () => JSON.parse(await fs.readFile(path.join(root, runId!, 'control', 'status.json'), 'utf8')).status === 'stopped');
    }
    await service.close();
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('a Terminal launch that never starts expires and a late window is cancelled', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'contextdrop-expired-launch-'));
  let service = await start(root, { claudeBinary: '/usr/bin/true' });
  try {
    const run = await launch(service.base, 'recover-request-001', 'claude');
    await service.close();
    const manifestPath = path.join(root, run.id, 'control', 'run.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    manifest.state.createdAt = new Date(Date.now() - 61_000).toISOString();
    await fs.writeFile(manifestPath, JSON.stringify(manifest));
    service = await start(root);
    const state = await (await fetch(`${service.base}/runs/${run.id}`, { headers })).json();
    assert.equal(state.status, 'failed');
    assert.match(state.error, /did not start/);
    assert.equal(JSON.parse(await fs.readFile(path.join(root, run.id, 'control', 'stop-request.json'), 'utf8')).id, run.id);
    assert.notEqual((await launch(service.base, 'after-expired-001')).id, run.id);
  } finally { await service.close(); await fs.rm(root, { recursive: true, force: true }); }
});

test('output and local reveal never follow generated symlinks or accept arbitrary paths', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'contextdrop-output-boundary-'));
  const opened: { filename: string; target: string }[] = [];
  const service = await start(root, { revealLocalPath: async (filename, target) => { opened.push({ filename, target }); } });
  try {
    const run = await launch(service.base);
    const control = path.join(root, run.id, 'control');
    const outside = path.join(root, 'unrelated-private-file');
    await fs.writeFile(outside, 'NEVER-EXPOSE-THIS-FIXTURE');
    await fs.symlink(outside, path.join(run.workspace, 'CONTEXTDROP-RESULT.md'));
    await fs.symlink(outside, path.join(control, 'last-message.md'));
    await fs.writeFile(path.join(control, 'codex-events.jsonl'), `${'x'.repeat(100_000)}\n${JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'Latest fixture message\u001b]0;title\u0007' } })}\n`);
    const output = await (await fetch(`${service.base}/runs/${run.id}/output?path=${encodeURIComponent(outside)}`, { headers })).json();
    assert.equal(output.result.text, '');
    assert.equal(output.result.source, null);
    assert.equal(output.log.truncated, true);
    assert.match(output.log.text, /Latest fixture message/);
    assert.ok(!JSON.stringify(output).includes('NEVER-EXPOSE'));
    assert.ok(!output.log.text.includes('\u001b'));
    for (const body of [{ target: 'report' }, { target: 'workspace', path: outside }, { target: outside }]) {
      assert.equal((await fetch(`${service.base}/runs/${run.id}/reveal`, { method: 'POST', headers, body: JSON.stringify(body) })).status, 400);
    }
    assert.equal(opened.length, 0);
    assert.equal((await fetch(`${service.base}/runs/${run.id}/reveal`, { method: 'POST', headers, body: JSON.stringify({ target: 'workspace' }) })).status, 200);
    assert.deepEqual(opened, [{ filename: await fs.realpath(run.workspace), target: 'workspace' }]);
    await fs.unlink(path.join(run.workspace, 'CONTEXTDROP-RESULT.md'));
    await fs.writeFile(path.join(run.workspace, 'CONTEXTDROP-RESULT.md'), 'A'.repeat(50_000));
    const report = await (await fetch(`${service.base}/runs/${run.id}/output`, { headers })).json();
    assert.equal(report.result.truncated, true);
    assert.equal(report.result.text.length, 32 * 1024);
    assert.equal((await fetch(`${service.base}/runs/${run.id}/reveal`, { method: 'POST', headers, body: JSON.stringify({ target: 'report' }) })).status, 200);
    assert.equal(opened.at(-1)?.target, 'report');
  } finally { await service.close(); await fs.rm(root, { recursive: true, force: true }); }
});

test('recovered browser sessions cannot resurrect approvals after the companion has restarted', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'contextdrop-browser-recovery-'));
  const id = randomUUID();
  const control = path.join(root, id, 'control');
  const workspace = path.join(root, id, 'project');
  await fs.mkdir(control, { recursive: true }); await fs.mkdir(workspace);
  await fs.writeFile(path.join(control, 'run.json'), JSON.stringify({ version: 1, state: { id, executor: 'browser', status: 'launching', workspace, analysisId: plan.analysisId, sourceUrl: plan.sourceUrl, title: plan.title, goal: plan.goal, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }));
  await fs.writeFile(path.join(control, 'browser-state.json'), JSON.stringify({ status: 'awaiting_approval', pendingAction: { id: 'obsolete-approval' }, history: [{ action: 'Opened the controlled fixture page', status: 'performed' }] }));
  const service = await start(root);
  try {
    const state = await (await fetch(`${service.base}/runs/${id}`, { headers })).json();
    assert.equal(state.status, 'interrupted');
    assert.equal(state.canResume, false);
    assert.equal(state.canStop, false);
    assert.equal(state.pendingAction, undefined);
    assert.equal(state.history[0].action, 'Opened the controlled fixture page');
    assert.match(state.message, /cannot resume/);
    const output = await (await fetch(`${service.base}/runs/${id}/output`, { headers })).json();
    assert.match(output.log.text, /\[performed\] Opened the controlled fixture page/);
    assert.equal((await fetch(`${service.base}/runs/${id}/approve`, { method: 'POST', headers, body: JSON.stringify({ actionId: 'obsolete-approval', approved: true }) })).status, 404);
    assert.notEqual((await launch(service.base)).id, id);
  } finally { await service.close(); await fs.rm(root, { recursive: true, force: true }); }
});
