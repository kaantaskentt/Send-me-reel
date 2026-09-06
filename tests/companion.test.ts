import test from 'node:test';
import http from 'node:http';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { AddressInfo } from 'node:net';
import { createCompanionServer, shellQuote } from '../companion/server.js';
import { parseBrowserAction, assertBrowserUrl } from '../companion/browser.js';
import type { ReplicationPlan } from '../shared/execution-plan.js';

export const fixturePlan: ReplicationPlan = {
  version: 1, analysisId: 'test-analysis', sourceUrl: 'https://example.com/tutorial', title: 'Build a tiny demo', goal: 'Create a working local demo', mode: 'build', summary: 'A controlled test fixture.', prerequisites: ['Node.js'],
  steps: [{ id:'s1', instruction:'Make a page with a button', evidenceIds:['e1'], kind:'observed', verification:'Click the button and inspect the changed text' }],
  evidence:[{id:'e1',kind:'frame',text:'The creator clicks a button and it displays Ready.',timestampSec:3}],warnings:['Fixture evidence.'],successCriteria:['The button works.']
};
const token = 'test-token-that-is-long-enough-for-local-pairing';
async function setup(launch: (file:string)=>Promise<void> = async()=>{}, withoutCodex = false) {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'contextdrop-companion-test-'));
  const server = createCompanionServer({ token, allowedOrigins:['http://localhost:3000'], rootDir, codexBinary:withoutCodex ? undefined : '/usr/bin/true', platform:'darwin', launchTerminal:launch });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {rootDir,base, cleanup:async()=>{server.closeAllConnections(); await new Promise<void>(r=>server.close(()=>r())); await fs.rm(rootDir,{recursive:true,force:true});}};
}
const headers={'Content-Type':'application/json',Authorization:`Bearer ${token}`,Origin:'http://localhost:3000'};
test('pairing and origin/host boundaries reject unauthorized clients',async()=>{
  const t=await setup(); try{
    assert.equal((await fetch(`${t.base}/health`)).status,401);
    assert.equal((await fetch(`${t.base}/health`,{headers:{...headers,Origin:'https://evil.example'}})).status,403);
    const badHost = await new Promise<number>(resolve => { http.get(`${t.base}/health`, { headers: { ...headers, Host: 'evil.example' } }, r => { r.resume(); resolve(r.statusCode!); }); }); assert.equal(badHost,403);
    const ok=await fetch(`${t.base}/health`,{headers}); assert.equal(ok.status,200);assert.equal(ok.headers.get('Access-Control-Allow-Origin'),'http://localhost:3000');
    const preflight=await fetch(`${t.base}/runs`,{method:'OPTIONS',headers:{Origin:'http://localhost:3000'}});assert.equal(preflight.status,204);
  } finally{await t.cleanup();}
});
test('data-only packet launches a fixed command in a fresh workspace; duplicate requests do not run twice',async()=>{
  let launched=''; let count=0; const t=await setup(async p=>{launched=p;count++;});try{
    const plan={...fixturePlan,goal:'Print a literal $(touch /tmp/should-not-exist) and `command`'};
    const response=await fetch(`${t.base}/runs`,{method:'POST',headers:{...headers,'Idempotency-Key':'request-0001'},body:JSON.stringify({plan})});
    assert.equal(response.status,201);const run=await response.json();
    assert.equal(run.status,'launching');assert.ok(run.workspace.startsWith(t.rootDir));
    const script=await fs.readFile(launched,'utf8');assert.ok(!script.includes('touch'));assert.ok(!script.includes(plan.goal));assert.match(script,/runner.mjs/);
    assert.equal(JSON.parse(await fs.readFile(path.join(run.workspace,'.contextdrop/plan.json'),'utf8')).goal,plan.goal);
    const duplicate=await fetch(`${t.base}/runs`,{method:'POST',headers:{...headers,'Idempotency-Key':'request-0001'},body:JSON.stringify({plan})});assert.equal(duplicate.status,200);assert.equal(count,1);
    const parallel=await fetch(`${t.base}/runs`,{method:'POST',headers,body:JSON.stringify({plan})});assert.equal(parallel.status,409);
  }finally{await t.cleanup();}
});
test('invalid packets, arbitrary executors and unavailable browser provider fail without launch',async()=>{
  let count=0;const t=await setup(async()=>{count++;});try{
    for(const body of [{plan:{...fixturePlan,command:'rm -rf /'}},{plan:fixturePlan,executor:'shell'},{plan:fixturePlan,executor:'browser'}]){
      const r=await fetch(`${t.base}/runs`,{method:'POST',headers,body:JSON.stringify(body)});assert.ok([400,409].includes(r.status));
    }
    assert.equal(count,0);assert.deepEqual(await fs.readdir(t.rootDir),[]);
  }finally{await t.cleanup();}
});
test('failed Terminal open is reported as failure, not a running or successful job',async()=>{
  const t=await setup(async()=>{throw new Error('Terminal unavailable');});try{
    const r=await fetch(`${t.base}/runs`,{method:'POST',headers,body:JSON.stringify({plan:fixturePlan})});assert.equal(r.status,500);assert.match((await r.json()).error,/Terminal unavailable/);
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
    const health=await (await fetch(`${t.base}/health`,{headers})).json();assert.equal(health.status,'ready');assert.equal(health.capabilities.terminal,false);
    const response=await fetch(`${t.base}/runs`,{method:'POST',headers,body:JSON.stringify({plan:fixturePlan,executor:'terminal'})});assert.equal(response.status,409);assert.match((await response.json()).error,/Install and sign in to Codex/);
  }finally{await t.cleanup();}
});
