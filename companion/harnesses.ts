import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import { constants } from 'node:fs';

const execute = promisify(execFile);
export type Harness = 'codex' | 'claude';

/** Read installed CLI metadata only; never authenticate or start an AI session. */
export async function resolveInstalledHarnesses(env: NodeJS.ProcessEnv = process.env): Promise<{ codexBinary?: string; claudeBinary?: string }> {
  async function inspect(binary: string, name: Harness) {
    if (!path.isAbsolute(binary) || /[\r\n\u0000]/.test(binary)) throw new Error('Expected an absolute executable path');
    if (!(await fs.stat(binary)).isFile()) throw new Error('Expected an executable file');
    await fs.access(binary, constants.X_OK);
    const version = await execute(binary, ['--version'], { timeout: 10_000, maxBuffer: 32_768 });
    if (name === 'codex' && !/^codex-cli \d+\.\d+\.\d+/m.test(version.stdout)) throw new Error('The selected binary did not identify itself as Codex CLI');
    const { stdout } = await execute(binary, ['--help'], { timeout: 10_000, maxBuffer: 128_000 });
    if (name === 'claude') {
      if (!['--safe-mode', '--permission-mode', '--no-chrome', '--name'].every(flag => stdout.includes(flag))) throw new Error('Claude Code is missing the required inspection controls');
    } else {
      const help = await execute(binary, ['exec', '--help'], { timeout: 10_000, maxBuffer: 128_000 });
      if (!['--ask-for-approval', '--no-alt-screen'].every(flag => stdout.includes(flag)) || !['--sandbox', '--cd', '--skip-git-repo-check', '--ignore-user-config', '--json', '--output-last-message'].every(flag => help.stdout.includes(flag))) throw new Error('Codex CLI is missing required runner options');
    }
    return binary;
  }
  async function resolve(name: Harness): Promise<string | undefined> {
    if (name === 'codex' && env.CONTEXTDROP_CODEX_BINARY !== undefined) {
      try { return await inspect(env.CONTEXTDROP_CODEX_BINARY, 'codex'); }
      catch { throw new Error('CONTEXTDROP_CODEX_BINARY must point to an installed executable Codex CLI with the required sandbox, approval and exec options. The explicit override was not used.'); }
    }
    try {
      const result = await execute('/usr/bin/which', [name], { timeout: 5_000, maxBuffer: 32_768, env: { PATH: env.PATH ?? process.env.PATH } });
      const binary = result.stdout.trim();
      if (!path.isAbsolute(binary) || binary.includes('\n')) return undefined;
      return await inspect(binary, name);
    } catch { return undefined; }
  }
  const [codexBinary, claudeBinary] = await Promise.all([resolve('codex'), resolve('claude')]);
  return { codexBinary, claudeBinary };
}
