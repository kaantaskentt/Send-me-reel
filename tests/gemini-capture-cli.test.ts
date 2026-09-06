import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const source = "https://www.youtube.com/watch?v=QhmhUgccaS0";

test("native CLI rejects mismatched resume without erasing an existing capture", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-gemini-resume-"));
  const output = path.join(directory, "analysis.json");
  const original = JSON.stringify({ id: "preserved", source_url: source, metadata: { source_evidence: { native_video: { version: 1 } } } });
  try {
    await fs.writeFile(output, original, { mode: 0o600 });
    await assert.rejects(execFileAsync(process.execPath, ["--import", "tsx", "scripts/capture-gemini.ts", "https://www.youtube.com/watch?v=Gda-1msq7pg", "--output", output, "--resume"], {
      cwd: path.resolve(import.meta.dirname, ".."), timeout: 10_000, env: { ...process.env, GEMINI_API_KEY: "test-no-provider-call" },
    }), (error: unknown) => {
      assert.match((error as { stderr: string }).stderr, /RESUME_MISMATCH/);
      return true;
    });
    assert.equal(await fs.readFile(output, "utf8"), original);
    await assert.rejects(fs.stat(`${output}.gemini.lock`), /ENOENT/);
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test("native CLI refuses a live output lock without touching current evidence", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-gemini-lock-"));
  const output = path.join(directory, "analysis.json");
  try {
    await fs.writeFile(output, "existing evidence", { mode: 0o600 });
    await fs.writeFile(`${output}.gemini.lock`, JSON.stringify({ processId: process.pid }), { mode: 0o600 });
    await assert.rejects(execFileAsync(process.execPath, ["--import", "tsx", "scripts/capture-gemini.ts", source, "--output", output], {
      cwd: path.resolve(import.meta.dirname, ".."), timeout: 10_000, env: { ...process.env, GEMINI_API_KEY: "test-no-provider-call" },
    }), (error: unknown) => {
      assert.match((error as { stderr: string }).stderr, /CAPTURE_ALREADY_RUNNING/);
      return true;
    });
    assert.equal(await fs.readFile(output, "utf8"), "existing evidence");
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});
