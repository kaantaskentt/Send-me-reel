import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";

const exec = promisify(execFile);
const script = path.resolve("scripts/analyze-video.ts");
const loader = path.resolve("node_modules/tsx/dist/loader.mjs");

test("downloaded CLI uses Gemini first, preserves contracts, and cancels with both source cleanups", { timeout: 90_000 }, async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-hybrid-cli-"));
  const video = path.join(directory, "fixture.mp4"), downloader = path.join(directory, "yt-dlp-fixture"), provider = path.join(directory, "provider.mjs");
  try {
    assert.ok(ffmpegPath);
    await exec(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=160x90:rate=10", "-t", "1", "-c:v", "libx264rgb", "-crf", "0", "-threads", "1", "-y", video], { timeout: 15_000 });
    await fs.writeFile(downloader, `#!${process.execPath}
const fs=require('node:fs');const args=process.argv.slice(2);
if(args.includes('--skip-download')) process.stdout.write(JSON.stringify({source:{id:'synthetic',title:'Synthetic video',duration:1}}));
else fs.copyFileSync(process.env.FIXTURE_VIDEO,args[args.indexOf('-o')+1]);
`, { mode: 0o700 });
    await fs.writeFile(provider, `import fs from 'node:fs';
globalThis.fetch=async(input,init={})=>{
 const url=String(input),method=init.method||'GET';
 if(!url.startsWith('https://generativelanguage.googleapis.com/')) throw new Error('Unexpected paid provider');
 fs.appendFileSync(process.env.FIXTURE_CALLS,JSON.stringify({method,kind:url.includes(':generateContent')?'generate':url.includes('/upload/')?'upload':'file'})+'\\n');
 if(method==='DELETE') { if(init.signal.aborted) throw new Error('Cleanup used cancelled signal'); return new Response(null,{status:204}); }
 if(url.includes('/upload/v1beta/files')) return new Response(null,{headers:{'x-goog-upload-url':'https://generativelanguage.googleapis.com/upload/fixture'}});
 if(url.endsWith('/upload/fixture')) {
  const reader=init.body.getReader();while(!(await reader.read()).done){}reader.releaseLock();
  return new Response(JSON.stringify({file:{name:'files/fixture',uri:'https://generativelanguage.googleapis.com/v1beta/files/fixture',mimeType:'video/mp4',state:'ACTIVE'}}));
 }
 if(url.includes(':generateContent')) {
  if(process.env.FIXTURE_MODE==='cancel') {
   const cancelled=new Promise((_,reject)=>init.signal.addEventListener('abort',()=>reject(init.signal.reason),{once:true}));
   process.kill(process.pid,'SIGTERM');return cancelled;
  }
  if(process.env.FIXTURE_MODE==='failure') return new Response('private-provider-error-content',{status:429});
  const request=JSON.parse(init.body),parts=request.contents[0].parts;
  const ids=request.generationConfig.responseSchema.properties.precisionObservations.items.properties.cropId.enum;
  if(!parts.some(p=>p.fileData)||parts.filter(p=>p.inlineData).length!==ids.length)throw new Error('Missing video or crops');
  const fields={description:'Synthetic visible detail',onScreenText:[],urls:[],tools:[],uncertain:true};
  const result={summary:'Synthetic audio/video overview',limitations:[],observations:[{...fields,timestamp:'00:00',speech:'Model paraphrase'}],precisionObservations:ids.map(cropId=>({...fields,cropId}))};
  return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(result)}]}}],usageMetadata:{promptTokenCount:100,candidatesTokenCount:20,totalTokenCount:120}}));
 }
 throw new Error('Unexpected provider request');
};
`);
    for (const mode of ["success", "failure", "cancel"]) {
      const output = path.join(directory, `${mode}.json`), callsFile = path.join(directory, `${mode}.jsonl`);
      let exitCode = 0, trace = "";
      try {
        const result = await exec(process.execPath, ["--import", loader, "--import", provider, script, "https://www.instagram.com/reel/synthetic/", "--output", output, "--timeout-seconds", "30"], {
          cwd: directory, timeout: 40_000, maxBuffer: 100_000,
          env: { PATH: process.env.PATH, YTDLP_PATH: downloader, FIXTURE_VIDEO: video, FIXTURE_MODE: mode, FIXTURE_CALLS: callsFile,
            GEMINI_API_KEY: "fixture-gemini-key", OPENAI_API_KEY: "fixture-openai-key", GOOGLE_API_KEY: "", DOTENV_CONFIG_QUIET: "true" },
        });
        trace = result.stdout + result.stderr;
      } catch (error) { const result = error as { code: number; stdout: string; stderr: string }; exitCode = result.code; trace = result.stdout + result.stderr; }
      const analysis = JSON.parse(await fs.readFile(output, "utf8"));
      const calls = (await fs.readFile(callsFile, "utf8")).trim().split("\n").map(line => JSON.parse(line));
      assert.equal(analysis.metadata.local_capture.reader, "gemini");
      assert.equal(analysis.metadata.source_evidence.native_video.sourceUrl, "https://www.instagram.com/reel/synthetic/");
      assert.equal(analysis.metadata.source_evidence.transcript.status, "not_requested");
      assert.equal(analysis.transcript, null);
      assert.equal(analysis.metadata.source_evidence.provider_files.deleted, 1);
      assert.equal(calls.filter(call => call.kind === "generate").length, 1);
      assert.equal(calls.at(-1).method, "DELETE");
      assert.ok(!trace.includes("fixture-gemini-key") && !trace.includes("fixture-openai-key") && !trace.includes("private-provider-error-content"));
      assert.ok(!JSON.stringify(analysis).includes("fixture-gemini-key"));
      if (mode === "success") {
        assert.equal(exitCode, 0); assert.equal(analysis.status, "done");
        assert.equal(analysis.metadata.source_evidence.capture_complete, true);
        assert.equal(analysis.metadata.source_evidence.precision_video.coverage.semanticCoverage, "partial");
        assert.equal(analysis.metadata.source_evidence.native_video.usage.totalTokenCount, 120);
        assert.ok(analysis.frame_descriptions.some((item: any) => item.precisionCropId));
        await fs.access(analysis.metadata.local_evidence.videoPath);
        assert.ok(analysis.metadata.local_evidence.framePaths.length > 0);
      } else {
        assert.equal(exitCode, 1); assert.equal(analysis.status, "failed");
        assert.equal(analysis.metadata.source_evidence.capture_complete, false);
        assert.equal(analysis.metadata.local_evidence.sourceFileRemoved, true);
        assert.equal(analysis.metadata.local_evidence.videoPath, undefined);
        assert.ok(!(await fs.readdir(analysis.metadata.local_evidence.captureDirectory)).some(name => name.startsWith("video.")));
        if (mode === "failure") assert.equal(analysis.metadata.local_capture.errorCode, "GEMINI_HTTP_429");
        if (mode === "cancel") assert.equal(analysis.metadata.local_capture.errorCode, "CAPTURE_CANCELLED");
      }
    }
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});
