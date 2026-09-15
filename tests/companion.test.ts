import test from 'node:test';
import type { AddressInfo } from 'node:net';
import http from 'node:http';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createCompanionServer, shellQuote } from '../companion/server.js';
import { parseBrowserAction, assertBrowserUrl } from '../companion/browser.js';
import type { ReplicationPlan } from '../shared/execution-plan.js';
import type { SetupStatus } from '../companion/connections.js';

export const fixturePlan: ReplicationPlan = {
  version: 1, analysisId: 'test-analysis', sourceUrl: 'https://example.com/tutorial', title: 'Build a tiny demo', goal: 'Create a working local demo', mode: 'build', summary: 'A controlled test fixture.', prerequisites: ['Node.js'],
  steps: [{ id:'s1', instruction:'Make a page with a button', evidenceIds:['e1'], kind:'observed', verification:'Click the button and inspect the changed text' }],
  evidence:[{id:'e1',kind:'frame',text:'The creator clicks a button and it displays Ready.',timestampSec:3}],warnings:['Fixture evidence.'],successCriteria:['The button works.']
};
const token = 'test-token-that-is-long-enough-for-local-pairing';
function setupFixture(codex: boolean, claude: boolean, mode: 'exec' | 'interactive'): SetupStatus {
  const harness = (installed: boolean, mode: 'exec' | 'interactive') => ({ installed, supported: installed, version: installed ? 'fixture' : null, auth: installed ? 'authenticated' as const : 'unknown' as const, authEvidence: 'native_cli_status' as const, reason: null, mode, available: installed, unavailableReason: installed ? null : 'Fixture CLI unavailable' });
  return { version: 1, checkedAt: new Date().toISOString(), harnesses: { codex: harness(codex, mode), claude: harness(claude, 'interactive') }, connections: [] };
}
async function setup(launch: (file:string)=>Promise<void> = async()=>{}, withoutCodex = false, terminalMode: 'interactive' | 'exec' = 'exec', claudeBinary?: string, inspectSetup?: () => Promise<SetupStatus>) {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'contextdrop-companion-test-'));
  const server = createCompanionServer({ token, allowedOrigins:['http://localhost:3000'], rootDir, codexBinary:withoutCodex ? undefined : '/usr/bin/true', claudeBinary, terminalMode, platform:'darwin', launchTerminal:launch, launchRunner:launch, inspectSetup: inspectSetup || (async () => setupFixture(!withoutCodex, Boolean(claudeBinary), terminalMode)) });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { rootDir, base, request: fetch, cleanup: async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); await fs.rm(rootDir, { recursive: true, force: true }); } };
}
const headers={'Content-Type':'application/json',Authorization:`Bearer ${token}`,Origin:'http://localhost:3000'};
test('pairing and origin/host boundaries reject unauthorized clients',async()=>{
  const t=await setup(); try{
    assert.equal((await t.request(`${t.base}/health`)).status,401);
    assert.equal((await t.request(`${t.base}/health`,{headers:{...headers,Origin:'https://evil.example'}})).status,403);
    const badHost = await new Promise<number | undefined>((resolve, reject) => {
      http.get(`${t.base}/health`, { headers: { ...headers, Host: 'evil.example' } }, response => { response.resume(); resolve(response.statusCode); }).on('error', reject);
    }); assert.equal(badHost,403);
    const ok=await t.request(`${t.base}/health`,{headers}); assert.equal(ok.status,200);assert.equal(ok.headers.get('Access-Control-Allow-Origin'),'http://localhost:3000');
    const preflight=await t.request(`${t.base}/runs`,{method:'OPTIONS',headers:{Origin:'http://localhost:3000'}});assert.equal(preflight.status,204);
  } finally{await t.cleanup();}
});

test('Claude selection produces an interactive trusted bundle independently of Codex', async () => {
  let launched = '';
  const t = await setup(async filename => { launched = filename; }, true, 'exec', '/usr/bin/true');
  try {
    const health = await (await t.request(`${t.base}/health`, { headers })).json();
    assert.equal(health.capabilities.terminal, true);
    assert.deepEqual(health.capabilities.harnesses, { codex: false, claude: true });
    const plan = { ...fixturePlan, goal: 'Inspect literal $(touch /tmp/never-execute-this), then propose setup.' };
    const response = await t.request(`${t.base}/runs`, { method: 'POST', headers, body: JSON.stringify({ plan, executor: 'terminal', harness: 'claude', claudeBinary: '/bin/untrusted', terminalMode: 'exec' }) });
    assert.equal(response.status, 201);
    const run = await response.json(); assert.equal(run.harness, 'claude'); assert.equal(run.status, 'launching');
    const config = JSON.parse(await fs.readFile(path.join(path.dirname(launched), 'runner.json'), 'utf8'));
    assert.equal(config.claudeBinary, '/usr/bin/true'); assert.equal(config.codexBinary, undefined); assert.equal(config.harness, 'claude'); assert.equal(config.terminalMode, 'interactive');
    const script = await fs.readFile(launched, 'utf8'); assert.ok(!script.includes(plan.goal)); assert.ok(!script.includes('/bin/untrusted'));
    const instructions = await fs.readFile(path.join(run.workspace, '.contextdrop', 'task.md'), 'utf8');
    assert.match(instructions, /Selected harness: Claude Code/);
    assert.match(instructions, /Do not install dependencies, clone repositories, run project code/);
  } finally { await t.cleanup(); }
});

test('unavailable or arbitrary harnesses and browser-harness mixes never launch', async () => {
  let launched = 0;
  const t = await setup(async () => { launched++; });
  try {
    for (const request of [{ harness: 'claude' }, { harness: 'shell' }, { harness: ['claude'] }, { harness: 'claude', executor: 'browser' }]) {
      const result = await t.request(`${t.base}/runs`, { method: 'POST', headers, body: JSON.stringify({ plan: fixturePlan, executor: 'terminal', ...request }) });
      assert.ok([400, 409].includes(result.status));
    }
    assert.equal(launched, 0); assert.deepEqual(await fs.readdir(t.rootDir), []);
  } finally { await t.cleanup(); }
});
test('data-only packet launches a fixed command in a fresh workspace; duplicate requests do not run twice',async()=>{
  let launched=''; let count=0; const t=await setup(async p=>{launched=p;count++;});try{
    const plan={...fixturePlan,goal:'Print a literal $(touch /tmp/should-not-exist) and `command`'};
    const response=await t.request(`${t.base}/runs`,{method:'POST',headers:{...headers,'Idempotency-Key':'request-0001'},body:JSON.stringify({plan})});
    assert.equal(response.status,201);const run=await response.json();
    assert.equal(run.status,'launching');assert.ok(run.workspace.startsWith(t.rootDir));
    const script=await fs.readFile(launched,'utf8');assert.ok(!script.includes('touch'));assert.ok(!script.includes(plan.goal));assert.equal(JSON.parse(script).terminalMode,'exec');
    assert.equal(JSON.parse(await fs.readFile(path.join(run.workspace,'.contextdrop/plan.json'),'utf8')).goal,plan.goal);
    const duplicate=await t.request(`${t.base}/runs`,{method:'POST',headers:{...headers,'Idempotency-Key':'request-0001'},body:JSON.stringify({plan})});assert.equal(duplicate.status,200);assert.equal(count,1);
    const parallel=await t.request(`${t.base}/runs`,{method:'POST',headers,body:JSON.stringify({plan})});assert.equal(parallel.status,409);
  }finally{await t.cleanup();}
});
test('invalid packets, arbitrary executors and unavailable browser provider fail without launch',async()=>{
  let count=0;const t=await setup(async()=>{count++;});try{
    for(const body of [{plan:{...fixturePlan,command:'rm -rf /'}},{plan:fixturePlan,executor:'shell'},{plan:fixturePlan,executor:'browser'}]){
      const r=await t.request(`${t.base}/runs`,{method:'POST',headers,body:JSON.stringify(body)});assert.ok([400,409].includes(r.status));
    }
    assert.equal(count,0);assert.deepEqual(await fs.readdir(t.rootDir),[]);
  }finally{await t.cleanup();}
});
test('failed Terminal open is reported as failure, not a running or successful job',async()=>{
  const t=await setup(async()=>{throw new Error('Terminal unavailable');});try{
    const r=await t.request(`${t.base}/runs`,{method:'POST',headers,body:JSON.stringify({plan:fixturePlan})});assert.equal(r.status,500);assert.match((await r.json()).error,/Terminal unavailable/);
  }finally{await t.cleanup();}
});
test('browser action schema rejects code and unobserved selector syntax',()=>{
  assert.throws(()=>parseBrowserAction({type:'evaluate',description:'Run JS',targetId:null,url:null,text:'document.body.remove()'}));
  assert.throws(()=>parseBrowserAction({type:'click',description:'Click',targetId:'#delete-account',url:null,text:null}));
  assert.throws(()=>parseBrowserAction({type:'scroll',description:'Scroll',targetId:null,url:null,text:'5000'}));
  assert.equal(shellQuote("a'b"),"'a'\\''b'");
});
test('browser public URL boundary rejects machine/private endpoints without network',async()=>{
  for(const url of ['file:///etc/passwd','http://127.0.0.1','http://169.254.169.254','http://192.168.0.1','https://user:secret@example.com','https://example.com:43187']) await assert.rejects(assertBrowserUrl(url));
});

test('companion remains pairable without Codex and explains the missing Terminal capability',async()=>{
  const t=await setup(async()=>{},true);try{
    const health=await (await t.request(`${t.base}/health`,{headers})).json();assert.equal(health.status,'unavailable');assert.equal(health.companion,'reachable');assert.equal(health.capabilities.terminal,false);
    const response=await t.request(`${t.base}/runs`,{method:'POST',headers,body:JSON.stringify({plan:fixturePlan,executor:'terminal'})});assert.equal(response.status,409);assert.match((await response.json()).error,/Install and sign in to Codex/);
  }finally{await t.cleanup();}
});

test('streaming execution is selected only by trusted local configuration', async () => {
  for (const configured of ['interactive', 'exec'] as const) {
    let launched = '';
    const t = await setup(async filename => { launched = filename; }, false, configured);
    try {
      const response = await t.request(`${t.base}/runs`, { method: 'POST', headers, body: JSON.stringify({ plan: fixturePlan, terminalMode: configured === 'exec' ? 'interactive' : 'exec', codexModel: 'untrusted-web-model' }) });
      if (configured === 'interactive') { assert.equal(response.status, 409); assert.equal(launched, ''); continue; }
      assert.equal(response.status, 201);
      const config = JSON.parse(await fs.readFile(path.join(path.dirname(launched), 'runner.json'), 'utf8'));
      assert.equal(config.terminalMode, configured);
      assert.equal(config.codexModel, undefined);
      const health = await (await t.request(`${t.base}/health`, { headers })).json();
      assert.equal(health.execution, 'streaming-terminal');
    } finally { await t.cleanup(); }
  }
});

test('connections setup endpoint is paired, cached metadata and missing readiness fails closed', async () => {
  let probes = 0, launches = 0;
  const incomplete = { version: 1, checkedAt: new Date().toISOString(), harnesses: { codex: { installed: true, available: true } }, connections: [] } as unknown as SetupStatus;
  const t = await setup(async () => { launches++; }, false, 'exec', undefined, async () => { probes++; return incomplete; });
  try {
    assert.equal((await t.request(`${t.base}/connections`)).status, 401);
    assert.equal(probes, 0);
    assert.equal((await t.request(`${t.base}/connections`, { headers: { ...headers, Origin: 'https://evil.example' } })).status, 403);
    const response = await t.request(`${t.base}/connections`, { headers });
    assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), incomplete);
    const health = await (await t.request(`${t.base}/health`, { headers })).json();
    assert.equal(health.status, 'unavailable'); assert.equal(health.capabilities.terminal, false);
    assert.deepEqual(health.capabilities.harnesses, { codex: false, claude: false });
    const launch = await t.request(`${t.base}/runs`, { method: 'POST', headers, body: JSON.stringify({ plan: fixturePlan }) });
    assert.equal(launch.status, 409); assert.equal(launches, 0); assert.equal(probes, 1);
    assert.deepEqual(await fs.readdir(t.rootDir), []);
  } finally { await t.cleanup(); }
});

test('unknown connections and injected connection definitions cannot create a project', async () => {
  let launches = 0;
  const t = await setup(async () => { launches++; });
  try {
    for (const extra of [{ connectionIds: ['github', 'github'] }, { connectionIds: ['evil'] }, { connectionIds: null }, { connectionIds: { github: true } }, { connectionIds: [{ id: 'github', command: 'sh' }] }, { connections: { github: { command: 'sh' } } }]) {
      const response = await t.request(`${t.base}/runs`, { method: 'POST', headers, body: JSON.stringify({ plan: fixturePlan, ...extra }) });
      assert.ok([400, 409].includes(response.status));
    }
    assert.equal(launches, 0); assert.deepEqual(await fs.readdir(t.rootDir), []);
  } finally { await t.cleanup(); }
});

test('launch fingerprint binds connection scope, task and harness; retries cannot change them', async () => {
  let configPath = '', launches = 0;
  const t = await setup(async filename => { configPath = filename; launches++; });
  try {
    const keyedHeaders = { ...headers, 'Idempotency-Key': 'connection-scope-001' };
    const launch = (body: unknown) => t.request(`${t.base}/runs`, { method: 'POST', headers: keyedHeaders, body: JSON.stringify(body) });
    const response = await launch({ plan: fixturePlan, connectionIds: [] });
    assert.equal(response.status, 201);
    const run = await response.json();
    assert.deepEqual(run.connectionIds, []); assert.match(run.launchFingerprint, /^[a-f0-9]{64}$/);
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    const manifest = JSON.parse(await fs.readFile(path.join(path.dirname(configPath), 'run.json'), 'utf8'));
    assert.equal(config.launchFingerprint, run.launchFingerprint);
    assert.deepEqual(config.connectionIds, []); assert.equal(manifest.state.launchFingerprint, run.launchFingerprint);
    assert.match(await fs.readFile(path.join(run.workspace, '.gitignore'), 'utf8'), /^\.contextdrop\/\n\.env\n\.env\.\*\n$/);
    assert.equal((await launch({ plan: fixturePlan })).status, 200);
    for (const extra of [{ connectionIds: ['github'] }, { harness: 'claude' }, { plan: { ...fixturePlan, goal: 'A different goal' } }]) {
      const changed = await launch({ plan: fixturePlan, ...extra });
      assert.equal(changed.status, 409); assert.match((await changed.json()).error, /different or legacy launch/);
    }
    assert.equal(launches, 1);
  } finally { await t.cleanup(); }
});
