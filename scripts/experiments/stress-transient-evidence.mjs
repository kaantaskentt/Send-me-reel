// Offline mechanism stress test. Not the product's capture pipeline or a model benchmark.
// Run: node scripts/experiments/stress-transient-evidence.mjs
// Uses synthetic media only, ffmpeg, Sharp and macOS Vision; no network/API calls.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';

const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'contextdrop-frame-stress-'));
const width = 960, height = 540, frameCount = 60;
const repo = 'github.com/example/q7x-frame';
// Frozen before the first run. No tuning of detector thresholds on these cases.
const cases = [
  { id: 'static-large-lossless', size: 22, crf: 0 },
  { id: 'static-small-lossy', size: 14, crf: 23 },
  { id: 'tiny-heavy-compression', size: 8, crf: 35 },
  { id: 'low-contrast-static', size: 22, crf: 0, color: '#e1e1e1' },
  { id: 'moving-background', size: 22, crf: 23, motion: true },
  { id: 'scrolling-small', size: 14, crf: 23, scroll: true },
  { id: 'moving-tiny-compressed', size: 8, crf: 35, motion: true },
  { id: 'blurred', size: 22, crf: 28, blur: 1.3 },
  { id: 'single-frame-60fps', size: 22, crf: 23, fps: 60 },
  { id: 'two-frame-prompt', size: 22, crf: 23, count: 2, text: 'Use warm paper and one blue button.' },
  { id: 'low-contrast-moving', size: 22, crf: 23, color: '#e1e1e1', motion: true },
  { id: 'confusable-characters', size: 14, crf: 28, text: 'github.com/example/l0I-q1O' },
  { id: 'absent-static', size: 22, crf: 23, absent: true },
  { id: 'absent-moving', size: 22, crf: 23, absent: true, motion: true },
].map(c => ({ fps: 30, first: 17, count: 1, text: repo, color: '#111111', ...c }));

function execute(command, args, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = []; let stderr = '';
    child.stdout.on('data', c => chunks.push(c));
    child.stderr.on('data', c => { stderr = (stderr + c).slice(-5000); });
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => {
      clearTimeout(timer);
      code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`${command} exited ${code}: ${stderr}`));
    });
  });
}
const hash = buffer => createHash('sha256').update(buffer).digest('hex');
const normalize = text => text.toLowerCase().replace(/\s+/g, ' ').trim();
function draw(c, frame, visible) {
  const motion = c.motion ? `<rect x="${(frame * 29) % 850}" y="330" width="100" height="100" fill="#2359bf"/>` : '';
  const scroll = c.scroll ? Array.from({ length: 9 }, (_, i) => `<text x="70" y="${335 + (i * 38 + frame * 5) % 180}" font-family="Helvetica" font-size="16">Scrolling documentation row ${i + 1}</text>`).join('') : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#f5f5f7"/>
    <rect x="40" y="40" width="880" height="460" rx="16" fill="white"/>
    <text x="70" y="100" font-family="Helvetica" font-size="30" fill="#202124">Synthetic tutorial</text>
    <text x="70" y="145" font-family="Helvetica" font-size="18" fill="#666">Offline stress fixture. No real project or creator.</text>
    <rect x="64" y="226" width="832" height="84" fill="#eeeeee"/>
    <text x="78" y="275" font-family="Helvetica" font-size="${c.size}" fill="${c.color}">${visible ? c.text : ''}</text>
    ${motion}${scroll}
  </svg>`;
}

const started = performance.now();
const ocrBinary = path.join(directory, 'read-frame-text');
await execute('/usr/bin/swiftc', ['scripts/experiments/read-frame-text.swift', '-o', ocrBinary]);
const results = [];
for (const c of cases) {
  const caseStarted = performance.now();
  const folder = path.join(directory, c.id);
  await fs.mkdir(folder);
  for (let frame = 0; frame < frameCount; frame++) {
    const visible = !c.absent && frame >= c.first && frame < c.first + c.count;
    let pipeline = sharp(Buffer.from(draw(c, frame, visible)));
    if (c.blur) pipeline = pipeline.blur(c.blur);
    await pipeline.png().toFile(path.join(folder, `input-${String(frame).padStart(3, '0')}.png`));
  }
  const video = path.join(folder, 'fixture.mp4');
  await execute(ffmpeg, ['-v', 'error', '-framerate', String(c.fps), '-i', path.join(folder, 'input-%03d.png'), '-c:v', 'libx264', '-crf', String(c.crf), '-pix_fmt', 'yuv420p', video]);
  const detectorStarted = performance.now();
  // Bounded short fixtures only. Production must stream decoded frames and preserve PTS.
  const raw = await execute(ffmpeg, ['-v', 'error', '-i', video, '-f', 'rawvideo', '-pix_fmt', 'gray', '-']);
  const frameBytes = width * height;
  if (raw.length !== frameBytes * frameCount) throw new Error(`Frame accounting failed: ${c.id}`);
  const frames = Array.from({ length: frameCount }, (_, i) => raw.subarray(i * frameBytes, (i + 1) * frameBytes));
  const candidates = [0];
  for (let frame = 1; frame < frameCount; frame++) {
    let changedPixels = 0;
    for (let pixel = 0; pixel < frameBytes; pixel++) {
      if (Math.abs(frames[frame][pixel] - frames[frame - 1][pixel]) > 20) changedPixels++;
    }
    if (changedPixels >= 16) candidates.push(frame);
  }
  const decodeAndDetectorMs = Math.round(performance.now() - detectorStarted);
  const targetIndices = c.absent ? [] : Array.from({ length: c.count }, (_, i) => c.first + i);
  const targetHashes = new Set(targetIndices.map(i => hash(frames[i])));
  const sampling = {};
  for (const fps of [1, 2]) {
    const samples = await execute(ffmpeg, ['-v', 'error', '-i', video, '-vf', `fps=${fps}`, '-f', 'rawvideo', '-pix_fmt', 'gray', '-']);
    let targetRetained = false;
    for (let offset = 0; offset < samples.length; offset += frameBytes) {
      if (targetHashes.has(hash(samples.subarray(offset, offset + frameBytes)))) targetRetained = true;
    }
    sampling[fps] = { frames: samples.length / frameBytes, targetRetained: c.absent ? null : targetRetained };
  }
  const ocrPaths = [];
  for (const index of candidates) {
    const file = path.join(folder, `candidate-${String(index).padStart(3, '0')}.png`);
    await sharp(frames[index], { raw: { width, height, channels: 1 } }).png().toFile(file);
    ocrPaths.push(file);
  }
  // An oracle diagnostic: known target location/interval, unavailable to the real system.
  // It separates recognition limits from candidate selection; do not score it as detection.
  const oraclePaths = [];
  if (!c.absent) {
    const full = path.join(folder, 'oracle-full.png'), crop = path.join(folder, 'oracle-crop-3x.png');
    const source = sharp(frames[c.first], { raw: { width, height, channels: 1 } });
    await source.clone().png().toFile(full);
    await source.clone().extract({ left: 64, top: 226, width: 832, height: 84 }).resize(2496, 252).png().toFile(crop);
    oraclePaths.push(full, crop);
  }
  const ocrStarted = performance.now();
  const ocr = JSON.parse((await execute(ocrBinary, [...ocrPaths, ...oraclePaths])).toString());
  const exact = item => item?.text.some(t => normalize(t) === normalize(c.text)) ?? false;
  const candidateReadings = ocr.filter(item => item.file.startsWith('candidate-'));
  const recoveredIndices = candidateReadings.filter(exact).map(item => Number(item.file.match(/\d+/)[0]));
  const result = {
    ...c, durationMs: c.absent ? 0 : c.count * 1000 / c.fps, encodedSha256: hash(await fs.readFile(video)),
    decodedFrames: frames.length, candidates, candidateFraction: candidates.length / frames.length,
    targetCandidateRetained: c.absent ? null : targetIndices.some(i => candidates.includes(i)),
    targetRecoveredFromCandidates: c.absent ? null : recoveredIndices.some(i => targetIndices.includes(i)),
    exactTargetOnAbsentControl: c.absent ? recoveredIndices.length > 0 : null,
    sampling, decodeAndDetectorMs, ocrMs: Math.round(performance.now() - ocrStarted),
    oracle: c.absent ? null : {
      fullFrameExact: exact(ocr.find(item => item.file === 'oracle-full.png')),
      crop3xExact: exact(ocr.find(item => item.file === 'oracle-crop-3x.png')),
      readings: ocr.filter(item => item.file.startsWith('oracle-')),
    },
    elapsedMs: Math.round(performance.now() - caseStarted),
  };
  await fs.writeFile(path.join(folder, 'ocr.json'), JSON.stringify(ocr, null, 2) + '\n');
  results.push(result);
  process.stderr.write(`${c.id}: candidates ${candidates.length}/60; retained=${result.targetCandidateRetained}; OCR=${result.targetRecoveredFromCandidates}; crop=${result.oracle?.crop3xExact ?? 'n/a'}\n`);
}
const positive = results.filter(c => !c.absent);
const report = {
  status: 'offline_synthetic_stress_test', createdAt: new Date().toISOString(),
  platform: { os: os.platform(), release: os.release(), arch: os.arch(), node: process.version },
  fixture: { width, height, framesPerCase: frameCount, pixelFormat: 'yuv420p', cases: results.length },
  detector: { changedPixelDelta: 20, minimumChangedPixels: 16, comparesTo: 'previous decoded frame', tunedOnThisSet: false },
  summary: {
    decodedFrames: results.reduce((n, c) => n + c.decodedFrames, 0),
    candidateFrames: results.reduce((n, c) => n + c.candidates.length, 0),
    positiveCases: positive.length, negativeControls: results.length - positive.length,
    targetCandidatesRetained: positive.filter(c => c.targetCandidateRetained).length,
    exactTargetsRecoveredFromCandidates: positive.filter(c => c.targetRecoveredFromCandidates).length,
    oracleFullFrameExact: positive.filter(c => c.oracle.fullFrameExact).length,
    oracleCrop3xExact: positive.filter(c => c.oracle.crop3xExact).length,
    exactTargetsOnNegativeControls: results.filter(c => c.exactTargetOnAbsentControl).length,
    oneFpsRetained: positive.filter(c => c.sampling[1].targetRetained).length,
    twoFpsRetained: positive.filter(c => c.sampling[2].targetRetained).length,
  },
  elapsedMs: Math.round(performance.now() - started), results,
  limitations: [
    'Synthetic stress cases, deliberately adversarial; not a prevalence estimate or real Instagram benchmark.',
    'CFR clips only. No audio, variable timestamps, semantic understanding, real source acquisition or LLM tested.',
    'Target locations in oracle crops are ground truth, not an implemented detector.',
    'Exact matching lowercases and collapses whitespace; confidence calibration and prompt character error rate are not measured.',
    'Known-target negative controls measure exact spurious recovery only, not all possible hallucinated URLs.',
    'Whole-frame motion is intentionally a workload stressor. No candidate budget truncation is used.',
    'A decoded frame is not proof of readable content. Upscaling does not restore missing source pixels.',
    'Timings include local synthetic rendering and encoding; they do not estimate customer import latency.',
  ],
};
await fs.writeFile(path.join(directory, 'result.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ directory, resultFile: path.join(directory, 'result.json'), summary: report.summary, elapsedMs: report.elapsedMs }, null, 2));
