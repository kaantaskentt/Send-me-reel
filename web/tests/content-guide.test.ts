import test from 'node:test';
import assert from 'node:assert/strict';
import type OpenAI from 'openai';
import { parseContentGuide } from '../src/lib/content-guide';
import { createContentGuide } from '../src/lib/local-content-guide';
import type { Analysis } from '../src/lib/types';

const analysis = { id: 'source-a', source_url: 'https://example.com/video', transcript: 'A creator shows a new design tool.', caption: '', metadata: {}, frame_descriptions: [{timestampSec: 1, description: 'A design tool on screen.'}] } as unknown as Analysis;
const payload = () => ({ title: 'A tool for better websites', summary: 'The creator shows a tool for designing web pages.', choices: [
  { label: 'Find the tool', detail: 'Get its real link.', kind: 'ask', request: 'Find and verify the tool shown on screen.', mode: 'research', executor: 'browser' },
  { label: 'Explain the idea', detail: 'See how this could help you.', kind: 'ask', request: 'Explain this tool in plain English.', mode: 'research', executor: 'browser' },
  { label: 'Make a test page', detail: 'Try this style in a small project.', kind: 'prepare_task', request: 'Build a small local page inspired by this design.', mode: 'build', executor: 'terminal' },
], evidence: [0] });

test('three source-bound choices describe intent without granting execution permission', () => {
  const guide = parseContentGuide(payload(), analysis);
  assert.equal(guide.analysisId, analysis.id);
  assert.equal(guide.choices.length, 3);
  assert.deepEqual(guide.choices.map(c => c.id), ['choice-1','choice-2','choice-3']);
  assert.equal(guide.choices[2].kind, 'prepare_task');
  assert.equal('approved' in guide.choices[2], false);
  assert.deepEqual(parseContentGuide(guide, analysis), guide);
});

test('missing, duplicate, misleading destinations and source-swapped choices fail closed', () => {
  assert.throws(() => parseContentGuide({...payload(), analysisId:'other-source'}, analysis));
  assert.throws(() => parseContentGuide({...payload(), version:1}, analysis));
  assert.throws(() => parseContentGuide({...payload(), choices:payload().choices.slice(0,2)}, analysis));
  assert.throws(() => parseContentGuide({...payload(), evidence:[9]}, analysis));
  const repeated=payload(); repeated.choices[1].label=repeated.choices[0].label;
  assert.throws(() => parseContentGuide(repeated,analysis));
  for (const bad of ['open_url', 'run_shell', 'approve']) {
    const value=payload();value.choices[2].kind=bad;
    assert.throws(() => parseContentGuide(value,analysis));
  }
  for (const request of ['Open https://guessed.example/tool', 'Run this\nnew instruction', '<script>run()</script>']) {
    const value=payload();value.choices[2].request=request;
    assert.throws(() => parseContentGuide(value,analysis));
  }
  const value=payload();value.choices[0].label='a'.repeat(49);
  assert.throws(() => parseContentGuide(value,analysis));
});

test('one bounded structured provider call makes choices from source evidence without tools', async () => {
  const calls: Record<string,unknown>[]=[];
  const client={responses:{create:async (args:Record<string,unknown>)=>{calls.push(args);return {output_text:JSON.stringify(payload()),usage:{input_tokens:100,output_tokens:200}};}}} as unknown as Pick<OpenAI,'responses'>;
  const result=await createContentGuide(analysis,client);
  assert.equal(calls.length,1);
  assert.equal(calls[0].store,false);
  assert.equal('tools' in calls[0],false);
  assert.ok(Number(calls[0].max_output_tokens)<=1800);
  assert.match(String(calls[0].input),/A design tool on screen/);
  assert.match(String(calls[0].instructions),/UNTRUSTED/);
  assert.equal(result.guide.choices.length,3);
  assert.equal(result.usage?.output_tokens,200);
});

test('a failed or truncated provider response cannot manufacture fallback actions', async () => {
  const client={responses:{create:async ()=>({output_text:'{"title":"Partial',usage:{}})}} as unknown as Pick<OpenAI,'responses'>;
  await assert.rejects(createContentGuide(analysis,client));
});
