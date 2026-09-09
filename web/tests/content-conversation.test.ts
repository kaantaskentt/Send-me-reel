import test from 'node:test';
import assert from 'node:assert/strict';
import { publicLink, evidenceContext, parseContentReply } from '../src/lib/content-conversation';
import { captureIsActive, selectCaptureReader } from '../src/lib/capture-routing';
import type { Analysis } from '../src/lib/types';

const reply = (overrides = {}) => JSON.stringify({ answer: 'Useful content.', actions: [], suggestions: ['Find the tools'], evidence: [], ...overrides });
test('content links and reader selection reject local origins, credential URLs and unsupported explicit readers', () => {
  for (const url of ['http://github.com/a/b', 'https://localhost/a', 'https://127.0.0.1/a', 'https://[::1]/a', 'https://user:pass@github.com/a/b', 'https://github.com:888/a/b', 'javascript:alert(1)']) assert.equal(publicLink(url), null);
  assert.equal(selectCaptureReader('https://21st.dev').provider, 'page');
  assert.equal(selectCaptureReader('https://github.com/kaantaskentt/recordflow').provider, 'page');
  assert.equal(selectCaptureReader('https://youtu.be/QhmhUgccaS0', 'auto', false).provider, 'detailed');
  assert.equal(selectCaptureReader('https://youtu.be/QhmhUgccaS0?t=30', 'auto', true).url, 'https://www.youtube.com/watch?v=QhmhUgccaS0');
  assert.equal(selectCaptureReader('https://www.instagram.com/reel/example/', 'auto', true).provider, 'detailed');
  assert.throws(() => selectCaptureReader('https://21st.dev', 'gemini', true));
  assert.throws(() => selectCaptureReader('https://youtu.be/QhmhUgccaS0', 'gemini', false));
});
test('resumed capture uses latest process start instead of original video creation time', () => {
  const now = Date.now();
  assert.equal(captureIsActive({ status: 'analyzing', created_at: new Date(now - 86_400_000).toISOString(), metadata: { local_capture: { startedAt: new Date(now - 1000).toISOString() } } }, now), true);
  assert.equal(captureIsActive({ status: 'done', created_at: new Date(now).toISOString() }, now), false);
});
test('source conversation preserves late frames and transcript, assigning indexes independently of source fields', () => {
  const analysis = { source_url: 'https://youtu.be/QhmhUgccaS0', transcript: 'a'.repeat(20_000) + 'important late fact', frame_descriptions: Array.from({length:95}, (_, i) => ({index:999, timestampSec:i*5, description:`frame${i}`})), caption:'b'.repeat(20_000), metadata: {} } as Analysis;
  const context=evidenceContext(analysis);
  assert.equal(context.observations.length,95);
  assert.equal(context.observations[94].index,94);
  assert.ok(context.transcript.endsWith('important late fact'));
  assert.equal(context.caption.length,20_000);
});
test('guessed destinations, invalid references and invalid task actions never become action buttons', () => {
  const data=parseContentReply(reply({ answer:'See [real](https://21st.dev/) and [guess](https://guess.example/). citeturn0search0', evidence:[0,95,-1,1.1,0], actions:[{id:'x',kind:'open_url',url:'https://guess.example/',label:'Guess',detail:'Unknown',goal:null,mode:'research'},{id:'y',kind:'open_url',url:'https://21st.dev/',label:'Open',detail:'Source',goal:null,mode:'research'},{id:'z',kind:'prepare_task',url:null,label:'Bad task',detail:'Bad',goal:'x',mode:'build'}] }),95,new Set(['https://21st.dev/']));
  assert.equal(data.actions.length,1);
  assert.equal(data.actions[0].url,'https://21st.dev/');
  assert.deepEqual(data.evidence,[0]);
  assert.ok(!data.answer.includes('turn0search'));
  assert.ok(!data.answer.includes('https://guess'));
  assert.deepEqual(data.allowedUrls,['https://21st.dev/']);
});
test('malformed and truncated replies fail rather than pretending a task exists', () => {
  assert.throws(()=>parseContentReply('{"answer":',0,new Set()));
  assert.throws(()=>parseContentReply(reply({answer:''}),0,new Set()));
});
test('research in a coding harness is a terminal inspection, not a browser walk', () => {
  const data=parseContentReply(reply({actions:[{id:'a',kind:'prepare_task',label:'Inspect',detail:'Read the repo',url:null,goal:'Inspect this public repository in Claude Code without installing dependencies.',mode:'research',executor:'browser',harness:'claude'}]}),0,new Set());
  assert.equal(data.actions[0].executor,'terminal');
  assert.equal(data.actions[0].harness,'claude');
});

test('long-source overview distributes excerpts and includes visual summary and explicit coverage', () => {
  const analysis = { id:'long', source_url:'https://example.com/long', transcript:'beginning '+ 'text '.repeat(30000) + ' late ending', caption:'description '.repeat(9000)+'caption ending', visual_summary:'Distinctive visual style', frame_descriptions:Array.from({length:2101},(_,i)=>({timestampSec:i,description:`frame${i}`})), metadata:{source_evidence:{media_kind:'video',capture_complete:true,native_video:{coverage:{complete:true}},warnings:['Sampled']}} } as unknown as Analysis;
  const context = evidenceContext(analysis);
  assert.equal(context.transcriptTruncated,true);
  assert.ok(context.transcript.includes('beginning'));
  assert.ok(context.transcript.endsWith('late ending'));
  assert.ok(context.caption.endsWith('caption ending'));
  assert.equal(context.visualSummary,'Distinctive visual style');
  assert.equal(context.observations.at(-1)?.index,2100);
  assert.equal(context.captureCoverage.mediaKind,'video');
  assert.deepEqual(context.captureCoverage.warnings,['Sampled']);
});

test('secondary-source citations use canonical read identities and separate observation bounds', () => {
  const saved={id:'source-b',source_url:'https://example.com/real',metadata:{title:'Actual saved source'},frame_descriptions:[{},{}]} as unknown as Analysis;
  const data=parseContentReply(reply({evidence:[0,1,2],sourceReferences:[{analysisId:'source-b',title:'Invented title',sourceUrl:'https://evil.example',evidence:[1,2,99,-1,1]},{analysisId:'not-read',evidence:[0]},{analysisId:'source-b',evidence:[0]}]}),1,new Set(),new Map([['source-b',saved]]));
  assert.deepEqual(data.evidence,[0]);
  assert.deepEqual(data.sourceReferences,[{analysisId:'source-b',title:'Actual saved source',sourceUrl:'https://example.com/real',evidence:[1]}]);
});
