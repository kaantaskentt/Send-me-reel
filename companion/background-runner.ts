import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { writeAtomicJson } from './run-store.js';
import { assertExecutionSelection, runnerEnvironment } from './execution-policy.mjs';

/** Start trusted, noninteractive Codex work without a Terminal window or shell. */
export async function launchBackgroundRunner(configPath: string): Promise<void> {
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  assertExecutionSelection(config.harness || 'codex', config.terminalMode, config.connectionIds);
  const controlDir = path.dirname(configPath);
  const env = runnerEnvironment();
  const child = spawn(process.execPath, [fileURLToPath(new URL('./runner.mjs', import.meta.url)), configPath], {
    cwd: config.workspace, env, shell: false, detached: true, stdio: 'ignore',
  });
  try {
    await new Promise<void>((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
    // A successful spawn alone is not a running task. Wait for the runner's
    // status handshake; a broken launcher must not leave the UI spinning.
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
      try {
        const status = JSON.parse(await fs.readFile(path.join(controlDir, 'status.json'), 'utf8'));
        if (status.id === config.id && ['running', 'failed', 'stopped', 'finished_unverified'].includes(status.status)) return;
      } catch { /* The runner writes its first status atomically. */ }
      if (child.exitCode !== null || child.signalCode !== null) throw new Error('The coding app closed before it started. Try starting the task again.');
      await delay(50);
    }
    throw new Error('The coding app did not start. Try starting the task again.');
  } catch (error) {
    try { await writeAtomicJson(path.join(controlDir, 'stop-request.json'), { id: config.id, requestedAt: new Date().toISOString() }); }
    finally { child.kill('SIGTERM'); }
    throw error;
  } finally {
    // The runner owns its lifetime, output, heartbeat and stop request. It can
    // keep working while the companion restarts and be discovered afterwards.
    child.unref();
  }
}
