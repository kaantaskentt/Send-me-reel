import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer, type AddressInfo } from 'node:net';
import { execFile } from 'node:child_process';
import { GuidedComputerRun, parseComputerAction, type ComputerPlanner } from '../companion/computer.js';
import { nativeActionArgs, parseNativeApps, parseNativeObservation, PeekabooAdapter, PEEKABOO_SIGNATURE_REQUIREMENT, type ComputerSetup, type NativeAction, type NativeAdapter, type NativeApp, type NativeObservation, type NativeWindow } from '../companion/native-mac.js';
import { createCompanionServer } from '../companion/server.js';

const app: NativeApp = { id: 'com.apple.calculator', name: 'Calculator', pid: 456 };
const window: NativeWindow = { id: '12', title: 'Calculator' };
const ready: ComputerSetup = { configured: true, available: true, status: 'ready', version: '4.4.0', message: 'Ready', permissions: { screenRecording: true, accessibility: true, eventSynthesizing: true }, setupSteps: [] };
const action = (type: NativeAction['type'], targetId: string | null = null, text: string | null = null): NativeAction => ({ type, targetId, text, url: null, description: `Test ${type}` });
function observationData() { return {
  snapshot_id: `ps1_${'a'.repeat(32)}`, snapshot_reusable: true, mutation_targeting_available: true, semantic_scope: 'exact_or_requested',
  _targetReceipt: { pid: app.pid, window_id: 12, process_start_identity_decimal: '18446744073709551111' },
  ui_elements: [{ id: 'button1', ax_role: 'AXButton', title: '2', is_actionable: true, is_enabled: true, bounds: { x: 0, y: 1, width: 40, height: 40 } }],
}; }
function observation() { return parseNativeObservation(observationData(), app, window, 'data:image/png;base64,fixture'); }
function adapter() {
  const effects: string[] = [];
  const native: NativeAdapter = {
    inspect: async () => ready,
    apps: async () => [{ ...app }],
    openApp: async () => { effects.push('open'); },
    windows: async () => [{ ...window }],
    observe: async () => observation(),
    act: async a => { effects.push(a.type); },
  };
  return { native, effects };
}
async function runFixture(planner: ComputerPlanner, native = adapter().native) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'contextdrop-native-test-'));
  const run = new GuidedComputerRun({ workspace, adapter: native, planner, onState: () => {} });
  return { run, workspace, cleanup: async () => { await run.stop(); await fs.rm(workspace, { recursive: true, force: true }); } };
}
const plan = { version: 1, analysisId: 'test-native', sourceUrl: 'https://example.com/tutorial', title: 'Use Calculator', goal: 'Calculate two plus two', mode: 'build', summary: 'A native fixture.', prerequisites: [], steps: [{ id: 's1', instruction: 'Use Calculator', evidenceIds: ['e1'], kind: 'observed', verification: 'Read the displayed result.' }], evidence: [{ id: 'e1', kind: 'frame', text: 'A calculator.', timestampSec: 1 }], warnings: [], successCriteria: ['Result is visible.'] };

test('codesign accepts the inline publisher requirement and refuses an app from another publisher', { skip: process.platform !== 'darwin' }, async () => {
  // Read-only OS signature verification: no app launch, capture or permissions request.
  const result = await new Promise<{ failed: boolean; stderr: string }>(resolve => {
    execFile('/usr/bin/codesign', ['--verify', '--strict', '-R', PEEKABOO_SIGNATURE_REQUIREMENT, '/System/Applications/Calculator.app'], { timeout: 10_000, encoding: 'utf8' }, (error, _stdout, stderr) => resolve({ failed: Boolean(error), stderr }));
  });
  assert.equal(result.failed, true);
  assert.match(result.stderr, /failed to satisfy specified code requirement/);
  assert.doesNotMatch(result.stderr, /invalid requirement specification/);
});

test('native action schema has no shell, coordinate, URL or arbitrary-key path', () => {
  for (const bad of [
    { ...action('click', 'button1'), command: 'echo hello' },
    { ...action('click', 'button1'), type: 'shell' },
    { ...action('click', 'button1'), url: 'file:///etc/passwd' },
    action('press', null, 'cmd+space'), action('scroll', 'button1', 'sideways'), action('type', 'button1', 'hi'),
  ]) assert.throws(() => parseComputerAction(bad));
  assert.deepEqual(parseComputerAction(action('click', 'button1')), action('click', 'button1'));
  const view = observation();
  assert.deepEqual(nativeActionArgs(action('click', 'button1'), view), ['click', '--on', 'button1', '--snapshot', view.snapshotId]);
  for (const text of ['hello\nReturn', 'hello\\nReturn', '--foreground', '\t', 'a'.repeat(1201)]) assert.throws(() => nativeActionArgs(action('type', null, text), view));
  assert.throws(() => nativeActionArgs(action('click', 'missing'), view));
  assert.throws(() => nativeActionArgs(action('press', null, 'cmd+shift+r'), view));
  assert.throws(() => nativeActionArgs(action('type', null, 'echo hello'), { ...view, app: { id: 'com.apple.Terminal', name: 'Terminal' } }));
});

test('app discovery excludes shells, code interpreters, settings and credential managers', () => {
  const apps = parseNativeApps({ apps: [
    { bundle_id: app.id, name: app.name, pid: app.pid },
    { bundle_id: 'com.apple.Terminal', name: 'Terminal', pid: 4 },
    { bundle_id: 'com.apple.systempreferences', name: 'System Settings', pid: 5 },
    { bundle_id: 'com.microsoft.VSCode', name: 'Code', pid: 6 },
    { bundle_id: 'com.password.manager', name: 'Passwords', pid: 7 },
  ] });
  assert.deepEqual(apps, [app]);
});

test('exact native observations reject partial, stale authority and private screens', () => {
  const data = observationData();
  for (const bad of [{ ...data, snapshot_reusable: false }, { ...data, semantic_scope: 'application_partial' }, { ...data, snapshot_id: 'latest' }, { ...data, _targetReceipt: { ...data._targetReceipt, pid: 999 } }, { ...data, _targetReceipt: undefined }, { ...data, ui_elements: [{ ...data.ui_elements[0], title: 'Password' }] }]) assert.throws(() => parseNativeObservation(bad, app, window, 'image'));
  const nextGeneration = parseNativeObservation({ ...data, _targetReceipt: { ...data._targetReceipt, process_start_identity_decimal: '18446744073709551112' } }, app, window, 'image');
  assert.notEqual(nextGeneration.fingerprint, observation().fingerprint);
});

test('missing pinned helper reports unavailable without invoking a command or touching the screen', async () => {
  let calls = 0;
  const native = new PeekabooAdapter({ configured: true, platform: 'darwin', binary: '/nonexistent/contextdrop-peekaboo', command: async () => { calls++; return ''; } });
  const result = await native.inspect();
  assert.equal(result.available, false); assert.equal(result.status, 'not_installed'); assert.equal(calls, 0);
  assert.throws(() => new PeekabooAdapter({ configured: true, binary: 'peekaboo' }));
});

test('native setup checks the pinned Bridge permissions and never substitutes local permission grants', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'contextdrop-permissions-test-'));
  const binary = path.join(dir, 'peekaboo'), socket = path.join(dir, 'bridge.sock');
  await fs.writeFile(binary, 'fixture only', { mode: 0o700 });
  const host = createServer(); await new Promise<void>(resolve => host.listen(socket, resolve));
  let source = 'bridge', accessibility = false;
  const calls: string[][] = [];
  const native = new PeekabooAdapter({ configured: true, platform: 'darwin', binary, socket, command: async (_binary, args) => {
    calls.push(args);
    if (args[0] === '--version') return 'Peekaboo 4.4.0';
    return JSON.stringify({ success: true, data: { source, permissions: [ { name: 'Screen Recording', isGranted: true }, { name: 'Accessibility', isGranted: accessibility }, { name: 'Event Synthesizing', isGranted: false } ] } });
  } });
  try {
    let state = await native.inspect(); assert.equal(state.status, 'needs_permissions'); assert.equal(state.available, false);
    accessibility = true; state = await native.inspect(); assert.equal(state.status, 'ready'); assert.equal(state.permissions.eventSynthesizing, false);
    source = 'local'; state = await native.inspect(); assert.equal(state.available, false); assert.equal(state.status, 'host_unavailable');
    assert.ok(calls.every(args => args[0] === '--version' || JSON.stringify(args) === JSON.stringify(['permissions', 'status', '--bridge-socket', socket, '--json'])));
  } finally { await new Promise<void>(resolve => host.close(() => resolve())); await fs.rm(dir, { recursive: true, force: true }); }
});

test('Mac task requires app consent, exact window consent and per-action approval', async () => {
  const { native, effects } = adapter();
  const steps = [action('open_app', app.id), action('select_window', window.id), action('click', 'button1'), action('finish')];
  const t = await runFixture(async () => steps.shift()!, native);
  try {
    await t.run.start(); assert.equal(t.run.state.status, 'awaiting_approval'); assert.deepEqual(effects, []);
    assert.match(t.run.state.pendingAction!.description, /let AI read/);
    await t.run.approve(t.run.state.pendingAction!.id, true);
    assert.deepEqual(effects, ['open']); assert.equal(t.run.state.pendingAction!.type, 'select_window');
    await t.run.approve(t.run.state.pendingAction!.id, true);
    assert.deepEqual(effects, ['open']); assert.equal(t.run.state.pendingAction!.type, 'click');
    await t.run.approve(t.run.state.pendingAction!.id, true);
    assert.deepEqual(effects, ['open', 'click']); assert.equal(t.run.state.status, 'finished_unverified');
    const report = JSON.parse(await fs.readFile(path.join(t.workspace, 'COMPUTER-RESULT.json'), 'utf8'));
    assert.equal(report.screenshot, undefined); assert.equal(report.status, 'finished_unverified');
  } finally { await t.cleanup(); }
});

test('changed content at approval cannot redirect a click', async () => {
  const { native, effects } = adapter();
  let changed = false;
  native.observe = async () => ({ ...observation(), fingerprint: changed ? 'another-screen' : observation().fingerprint });
  const steps = [action('open_app', app.id), action('select_window', window.id), action('click', 'button1')];
  const t = await runFixture(async () => steps.shift()!, native);
  try {
    await t.run.start(); await t.run.approve(t.run.state.pendingAction!.id, true); await t.run.approve(t.run.state.pendingAction!.id, true);
    changed = true; await t.run.approve(t.run.state.pendingAction!.id, true);
    assert.equal(t.run.state.status, 'needs_input'); assert.deepEqual(effects, ['open']); assert.match(t.run.state.message!, /app changed/);
  } finally { await t.cleanup(); }
});

test('stop aborts an in-flight planner and never dispatches its later result', async () => {
  let resolve!: (action: NativeAction) => void;
  let receivedSignal: AbortSignal | undefined;
  const { native, effects } = adapter();
  const t = await runFixture(async (_view, _history, signal) => { receivedSignal = signal; return new Promise(r => { resolve = r; }); }, native);
  try {
    const starting = t.run.start();
    for (let n = 0; !resolve && n < 100; n++) await new Promise(r => setTimeout(r, 1));
    assert.ok(resolve); await t.run.stop(); assert.equal(receivedSignal?.aborted, true);
    resolve(action('open_app', app.id)); await starting;
    assert.equal(t.run.state.status, 'stopped'); assert.equal(t.run.state.pendingAction, undefined); assert.deepEqual(effects, []);
  } finally { await t.cleanup(); }
});

test('rejected and stale approvals never execute', async () => {
  const { native, effects } = adapter();
  const t = await runFixture(async () => action('open_app', app.id), native);
  try {
    await t.run.start(); const id = t.run.state.pendingAction!.id;
    await assert.rejects(t.run.approve('stale', true), /expired/);
    await t.run.approve(id, false); await assert.rejects(t.run.approve(id, true), /expired/);
    assert.deepEqual(effects, []); assert.equal(t.run.state.status, 'needs_input');
  } finally { await t.cleanup(); }
});

test('ambiguous native delivery pauses and is not retried automatically', async () => {
  const { native, effects } = adapter();
  native.act = async () => { effects.push('attempt'); throw new Error('Mac action stopped (INDETERMINATE). Inspect before retrying.'); };
  const steps = [action('open_app', app.id), action('select_window', window.id), action('click', 'button1')];
  const t = await runFixture(async () => steps.shift()!, native);
  try {
    await t.run.start(); await t.run.approve(t.run.state.pendingAction!.id, true); await t.run.approve(t.run.state.pendingAction!.id, true); await t.run.approve(t.run.state.pendingAction!.id, true);
    assert.equal(t.run.state.status, 'needs_input'); assert.deepEqual(effects, ['open', 'attempt']);
  } finally { await t.cleanup(); }
});

test('computer setup and execution use paired endpoints; helper setup never starts a planner', async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'contextdrop-computer-server-'));
  const { native, effects } = adapter(); let opened = 0, planned = 0;
  const token = 'native-tests-pairing-token-long-enough';
  const server = createCompanionServer({ rootDir, token, platform: 'darwin', allowedOrigins: ['http://localhost:3000'], computerAdapter: native, computerPlanner: () => async () => { planned++; return action('open_app', app.id); }, openComputerHelper: async () => { opened++; } });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const headers = { Authorization: `Bearer ${token}`, Origin: 'http://localhost:3000', 'Content-Type': 'application/json' };
  try {
    assert.equal((await fetch(`${base}/computer/setup`)).status, 401);
    assert.equal((await fetch(`${base}/computer/setup`, { headers })).status, 200);
    assert.equal((await fetch(`${base}/computer/setup`, { method: 'POST', headers, body: JSON.stringify({ action: 'open_helper' }) })).status, 200);
    assert.equal((await fetch(`${base}/computer/setup`, { method: 'POST', headers, body: JSON.stringify({ action: 'grant_permissions' }) })).status, 409);
    assert.equal(opened, 1); assert.equal(planned, 0); assert.deepEqual(effects, []);
    const response = await fetch(`${base}/runs`, { method: 'POST', headers, body: JSON.stringify({ plan, executor: 'computer' }) });
    assert.equal(response.status, 201); const run = await response.json(); assert.equal(run.executor, 'computer');
    const stopped = await fetch(`${base}/runs/${run.id}/stop`, { method: 'POST', headers });
    assert.equal(stopped.status, 202); assert.equal((await stopped.json()).status, 'stopped'); assert.deepEqual(effects, []);
    let savedStatus: string | undefined;
    for (let attempt = 0; attempt < 100 && savedStatus !== 'stopped'; attempt++) {
      try { savedStatus = JSON.parse(await fs.readFile(path.join(rootDir, run.id, 'control/computer-state.json'), 'utf8')).status; } catch { /* Atomic state write is in flight. */ }
      if (savedStatus !== 'stopped') await new Promise(resolve => setTimeout(resolve, 5));
    }
    assert.equal(savedStatus, 'stopped');
  } finally { server.closeAllConnections(); await new Promise<void>(r => server.close(() => r())); await fs.rm(rootDir, { recursive: true, force: true }); }
});

test('a stalled optional Mac check does not block terminal health', async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'contextdrop-native-health-'));
  const native = adapter().native;
  native.inspect = () => new Promise(() => {});
  const harness = { installed: true, supported: true, version: 'fixture', auth: 'authenticated' as const, authEvidence: 'native_cli_status' as const, reason: null, mode: 'exec' as const, available: true, unavailableReason: null };
  const token = 'native-health-pairing-token-long-enough';
  const server = createCompanionServer({ rootDir, token, platform: 'darwin', allowedOrigins: ['http://localhost:3000'], codexBinary: '/usr/bin/true', terminalMode: 'exec', computerAdapter: native, inspectSetup: async () => ({ version: 1, checkedAt: new Date().toISOString(), harnesses: { codex: harness, claude: { ...harness, installed: false, available: false, mode: 'interactive' } }, connections: [] }) });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  try {
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const response = await fetch(`${base}/health`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(1000) });
    assert.equal(response.status, 200);
    const health = await response.json(); assert.equal(health.capabilities.terminal, true); assert.equal(health.capabilities.computer.available, false);
  } finally { server.closeAllConnections(); await new Promise<void>(r => server.close(() => r())); await fs.rm(rootDir, { recursive: true, force: true }); }
});
