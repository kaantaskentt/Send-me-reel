// Offline research experiment, not the production capture pipeline.
// Generates its own four-second video and measures candidate-frame recall.
// No provider calls, user media, network, or changes to .contextdrop state.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';

const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'contextdrop-transient-evidence-'));
const width = 960, height = 540, fps = 30, frameCount = 120;
const clues = [
  { id: 'one-frame-repository', first: 17, last: 17, text: 'github.com/example/brief-repo' },
  { id: 'two-frame-prompt', first: 61, last: 62, text: 'Use a warm paper background and a single blue action.' },
  { id: 'half-second-command', first: 97, last: 111, text: 'npm run preview' },
];

function draw(text = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="#f5f5f7"/>
  <rect x="40" y="40" width="880" height="460" rx="16" fill="white" stroke="#dedee3"/>
  <text x="72" y="100" font-family="Helvetica" font-size="30" fill="#202124">Synthetic AI tutorial</text>
  <text x="72" y="146" font-family="Helvetica" font-size="20" fill="#555">Test fixture. No creator content or real repository.</text>
  <rect x="64" y="226" width="832" height="84" rx="8" fill="#eeeeef"/>
  <text x="78" y="275" font-family="Helvetica" font-size="22" fill="#111">${text}</text>
  </svg>`;
}

async function execute(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    const chunks = [];
    child.stdout.on('data', chunk => chunks.push(chunk));
    child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-4000); });
    const timer = setTimeout(() => child.kill('SIGKILL'), 30_000);
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`ffmpeg ${code}: ${stderr}`)); });
  });
}

const started = performance.now();
const base = await sharp(Buffer.from(draw())).png().toBuffer();
const variants = await Promise.all(clues.map(c => sharp(Buffer.from(draw(c.text))).png().toBuffer()));
for (let i = 0; i < frameCount; i++) {
  const clueIndex = clues.findIndex(c => i >= c.first && i <= c.last);
  await fs.writeFile(path.join(directory, `input-${String(i).padStart(3, '0')}.png`), clueIndex < 0 ? base : variants[clueIndex]);
}
const video = path.join(directory, 'fixture.mp4');
await execute(['-v', 'error', '-framerate', String(fps), '-i', path.join(directory, 'input-%03d.png'), '-c:v', 'libx264', '-crf', '0', '-pix_fmt', 'yuv420p', video]);
const decodeStarted = performance.now();
const raw = await execute(['-v', 'error', '-i', video, '-f', 'rawvideo', '-pix_fmt', 'gray', '-']);
const frameBytes = width * height;
if (raw.length !== frameBytes * frameCount) throw new Error('Unexpected decoded frame count');
const frames = Array.from({ length: frameCount }, (_, i) => raw.subarray(i * frameBytes, (i + 1) * frameBytes));

// Deliberately simple all-frame candidate detector. This fixture has no camera
// motion; this is NOT evidence that the detector handles real social videos.
const candidates = [0];
for (let frame = 1; frame < frameCount; frame++) {
  let changedPixels = 0;
  for (let p = 0; p < frameBytes; p++) if (Math.abs(frames[frame][p] - frames[frame - 1][p]) > 20) changedPixels++;
  if (changedPixels >= 16) candidates.push(frame);
}
const detectorMs = Math.round(performance.now() - decodeStarted);
const recall = indices => clues.filter(c => indices.some(i => i >= c.first && i <= c.last)).map(c => c.id);
const hash = data => createHash('sha256').update(data).digest('hex');
// Run actual ffmpeg resampling too, not only the timestamp arithmetic.
const sampled = {};
for (const rate of [1, 2]) {
  const bytes = await execute(['-v', 'error', '-i', video, '-vf', `fps=${rate}`, '-f', 'rawvideo', '-pix_fmt', 'gray', '-']);
  const signatures = new Set();
  for (let offset = 0; offset < bytes.length; offset += frameBytes) signatures.add(hash(bytes.subarray(offset, offset + frameBytes)));
  sampled[`${rate}fps`] = { frames: bytes.length / frameBytes, cluesRetained: clues.filter(c => signatures.has(hash(frames[c.first]))).map(c => c.id) };
}
for (const index of candidates) await sharp(frames[index], { raw: { width, height, channels: 1 } }).png().toFile(path.join(directory, `candidate-${String(index).padStart(3, '0')}.png`));
const result = {
  status: 'offline_synthetic_experiment',
  fixture: { fps, durationSeconds: frameCount / fps, width, height, frameCount, encoding: 'H.264 lossless', sha256: hash(await fs.readFile(video)) },
  clues: clues.map(c => ({ ...c, startSeconds: c.first / fps, durationMs: (c.last - c.first + 1) * 1000 / fps })),
  actualFfmpegSampling: sampled,
  allFrameChangeDetector: { candidates, cluesRetained: recall(candidates), decodeAndDetectorMs: detectorMs },
  elapsedMs: Math.round(performance.now() - started),
  limitations: ['Three synthetic clues on a static background only.', 'Candidate retention is not OCR or semantic comprehension.', 'Real videos, motion, compression, unreadable text, rotated or partial prompts require a separate benchmark.', 'An available video frame is the temporal limit; missing or hidden pixels cannot be recovered.'],
};
await fs.writeFile(path.join(directory, 'result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ directory, ...result }, null, 2));
