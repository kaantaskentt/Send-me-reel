import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const execute = promisify(execFile);
export type Harness = 'codex' | 'claude';

/** Read installed CLI metadata only; never authenticate or start an AI session. */
export async function resolveInstalledHarnesses(): Promise<{ codexBinary?: string; claudeBinary?: string }> {
  async function resolve(name: Harness): Promise<string | undefined> {
    try {
      const result = await execute('/usr/bin/which', [name], { timeout: 5_000, maxBuffer: 32_768 });
      const binary = result.stdout.trim();
      if (!path.isAbsolute(binary) || binary.includes('\n')) return undefined;
      await execute(binary, ['--version'], { timeout: 10_000, maxBuffer: 32_768 });
      if (name === 'claude') {
        // Older clients must not silently lose the inspection-only launch controls.
        const { stdout } = await execute(binary, ['--help'], { timeout: 10_000, maxBuffer: 128_000 });
        if (!['--safe-mode', '--permission-mode', '--no-chrome', '--name'].every(flag => stdout.includes(flag))) return undefined;
      }
      return binary;
    } catch { return undefined; }
  }
  const [codexBinary, claudeBinary] = await Promise.all([resolve('codex'), resolve('claude')]);
  return { codexBinary, claudeBinary };
}
