import test from 'node:test';
import assert from 'node:assert/strict';
import { generateReplicationPlan, type CompletePlan } from '../src/lib/plan-generator';

const context = {id:'source-a',goal:'Build a small local checklist',mode:'build' as const,sourceUrl:'https://example.com/video',evidence:[{id:'frame-1',kind:'frame' as const,text:'A checklist is shown.',timestampSec:1}],warnings:[]};
const valid = () => ({title:'A checklist',summary:'Make a local checklist page.',prerequisites:[],warnings:[],successCriteria:['A checklist opens locally.'],steps:[{id:'step-1',instruction:'Build the local page.',evidenceIds:['frame-1'],kind:'inferred',verification:'Open the page and check it.'}]});
const response=(content:unknown)=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(content)}}]});

test('a bad evidence reference is retried once without relaxing source or approval boundaries', async()=>{
  const calls: Parameters<CompletePlan>[0][]=[];
  const invalid=valid(); invalid.steps[0].evidenceIds=['invented-id'];
  const plan=await generateReplicationPlan(async params=>{calls.push(params);return response(calls.length===1?invalid:valid());},context);
  assert.equal(calls.length,2); assert.equal(plan.analysisId,context.id); assert.equal(plan.goal,context.goal);
  assert.deepEqual(plan.evidence,context.evidence);
  assert.match(JSON.stringify(calls[1].messages),/unknown evidence references/);
  assert.equal('approved' in plan,false);
});

test('persistent invalid output, refusals and provider errors never become a runnable plan',async()=>{
  let calls=0;
  await assert.rejects(generateReplicationPlan(async()=>{calls++;return response({...valid(),steps:[]});},context),/PLAN_INVALID/);
  assert.equal(calls,2);
  calls=0;
  await assert.rejects(generateReplicationPlan(async()=>{calls++;return {choices:[{finish_reason:'stop',message:{content:null,refusal:'No'}}]};},context),/PLAN_INCOMPLETE/);
  assert.equal(calls,1);
  calls=0;
  await assert.rejects(generateReplicationPlan(async()=>{calls++;throw new Error('Provider unavailable');},context),/Provider unavailable/);
  assert.equal(calls,1);
});
