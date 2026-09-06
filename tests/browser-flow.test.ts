import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { AddressInfo } from 'node:net';
import { GuidedBrowserRun, type BrowserAction, type BrowserState } from '../companion/browser.js';

async function until(predicate:()=>boolean, timeout=15000) {
  const end=Date.now()+timeout;
  while(!predicate()) {if(Date.now()>end) throw new Error('State did not arrive');await new Promise(r=>setTimeout(r,50));}
}
const action=(type:BrowserAction['type'],description:string,extra:Partial<BrowserAction>={}):BrowserAction=>({type,description,targetId:null,url:null,text:null,...extra});
test('visible browser loop highlights an observed control, waits for approval, detects stale approvals and reports outcome for review',async()=>{
  const fixture=http.createServer((_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><title>ContextDrop browser fixture</title><body><h1>Guided build demo</h1><button onclick="this.outerHTML=\'<p>Result ready</p>\'">Build demo</button></body></html>');});
  await new Promise<void>(r=>fixture.listen(0,'127.0.0.1',r));
  const fixtureUrl=`http://127.0.0.1:${(fixture.address() as AddressInfo).port}/`;
  const workspace=await fs.mkdtemp(path.join(os.tmpdir(),'contextdrop-browser-test-'));
  let state:BrowserState={status:'launching',history:[]};
  let attempts=0;
  const run=new GuidedBrowserRun({workspace,headless:true,onState:s=>{state=s;},
    validateUrl:async value=>{if(value!==fixtureUrl)throw new Error('Only test fixture is allowed');},
    resolveDestination:async value=>({url:new URL(value),addresses:[{address:'127.0.0.1',family:4}]}),
    planner:async observation=>{
      attempts++;
      if(observation.url==='about:blank')return action('navigate','Open the controlled demo page',{url:fixtureUrl});
      if(observation.text.includes('Result ready'))return action('finish','Observed Result ready after the click. Review the result.');
      const target=observation.controls.find(c=>c.text==='Build demo');assert.ok(target);
      return action('click','Click Build demo to create the result',{targetId:target.id});
    }
  });
  try{
    await run.start();assert.equal(state.status,'awaiting_approval',state.message);assert.equal(state.pendingAction?.type,'navigate');assert.equal(attempts,1);
    await run.approve(state.pendingAction!.id,true);
    assert.equal(state.status,'awaiting_approval',state.message);assert.equal(state.pendingAction?.type,'click');assert.ok(state.screenshot?.startsWith('data:image/jpeg;base64,'));assert.equal(attempts,2);
    await fs.writeFile('/private/tmp/contextdrop-guided-browser-proof.jpg',Buffer.from(state.screenshot!.split(',')[1],'base64'));
    const id=state.pendingAction!.id;
    await assert.rejects(run.approve('stale-action-id',true),/stale/);
    assert.equal(state.status,'awaiting_approval',state.message);
    await run.approve(id,true);
    await until(()=>state.status==='finished_unverified');
    assert.equal(state.history.filter(h=>h.status==='performed').length,2);
    assert.equal(attempts,3);
    const result=JSON.parse(await fs.readFile(path.join(workspace,'BROWSER-RESULT.json'),'utf8'));
    assert.equal(result.status,'finished_unverified');assert.ok(!result.screenshot);
  }finally{await run.stop();fixture.closeAllConnections();await new Promise<void>(r=>fixture.close(()=>r()));await fs.rm(workspace,{recursive:true,force:true});}
});
test('declining an action stops progress until the user explicitly resumes',async()=>{
  const workspace=await fs.mkdtemp(path.join(os.tmpdir(),'contextdrop-browser-decline-'));
  let state:BrowserState={status:'launching',history:[]};let calls=0;
  const run=new GuidedBrowserRun({workspace,headless:true,onState:s=>{state=s;},validateUrl:async()=>{},planner:async()=>{calls++;return action('navigate','Open example',{url:'https://example.com'});}});
  try{await run.start();assert.equal(state.status,'awaiting_approval',state.message);await run.approve(state.pendingAction!.id,false);assert.equal(state.status,'needs_input');assert.equal(calls,1);await run.resume();assert.equal(calls,2);assert.equal(state.status,'awaiting_approval',state.message);}finally{await run.stop();await fs.rm(workspace,{recursive:true,force:true});}
});
