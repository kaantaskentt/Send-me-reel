import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import os from 'node:os';
import { runnerEnvironment } from './execution-policy.mjs';

const execute = promisify(execFile);
export type Harness = 'codex' | 'claude';
export type NativeAuth = 'authenticated' | 'not_authenticated' | 'unknown';
export interface HarnessStatus {
  installed: boolean;
  supported: boolean;
  version: string | null;
  auth: NativeAuth;
  authEvidence: 'native_cli_status';
  reason: string | null;
}

const codexExecFlags = ['--sandbox', '--cd', '--skip-git-repo-check', '--ignore-user-config', '--ignore-rules', '--strict-config', '--json', '--output-last-message'];
const claudeFlags = ['--safe-mode', '--permission-mode', '--no-chrome', '--name', '--setting-sources'];

/** Parse only affirmative native metadata; absence, errors and new formats are unknown. */
export function parseNativeAuth(harness: Harness, code: number | null, stdout: string, stderr = ''): NativeAuth {
  if (harness === 'claude') {
    try {
      const value = JSON.parse(stdout);
      if (code === 0 && value.loggedIn === true) return 'authenticated';
      if ((code === 0 || code === 1) && value.loggedIn === false) return 'not_authenticated';
    } catch { /* Never expose the raw diagnostic, account identity or config. */ }
  } else {
    const output = `${stdout}\n${stderr}`;
    if (code === 0 && /^Logged in using (ChatGPT|an API key|API key)(?:\s|$)/m.test(output)) return 'authenticated';
    if ((code === 0 || code === 1) && /^Not logged in\s*$/m.test(output)) return 'not_authenticated';
  }
  return 'unknown';
}

/** Metadata only: no login, refresh, MCP connection, model turn or browser. */
export async function inspectHarnessStatus(binary: string | undefined, harness: Harness, env: NodeJS.ProcessEnv = process.env): Promise<HarnessStatus> {
  const status: HarnessStatus = { installed: false, supported: false, version: null, auth: 'unknown', authEvidence: 'native_cli_status', reason: 'A supported local CLI was not found.' };
  if (!binary || !path.isAbsolute(binary) || /[\r\n\u0000]/.test(binary)) return status;
  const commandOptions = { cwd: os.tmpdir(), env: runnerEnvironment(env), timeout: 8_000, maxBuffer: 128_000 };
  try {
    await fs.access(binary, constants.X_OK);
    const version = await execute(binary, ['--version'], commandOptions);
    const match = harness === 'codex' ? version.stdout.match(/^codex-cli (\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?)/m) : version.stdout.match(/^(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?) \(Claude Code\)/m);
    if (!match) return status;
    status.installed = true;
    status.version = match[1]!;
    const help = await execute(binary, ['--help'], commandOptions);
    if (harness === 'codex') {
      const execHelp = await execute(binary, ['exec', '--help'], commandOptions);
      status.supported = help.stdout.includes('--approve-for-me') && codexExecFlags.every(flag => execHelp.stdout.includes(flag));
    } else status.supported = claudeFlags.every(flag => help.stdout.includes(flag));
    if (!status.supported) { status.reason = 'This CLI is missing required isolation controls. Update it using its native installer.'; return status; }
    const args = harness === 'codex' ? ['-c', 'cli_auth_credentials_store="auto"', 'login', 'status'] : ['--safe-mode', '--setting-sources', '', 'auth', 'status', '--json'];
    try {
      const result = await execute(binary, args, commandOptions);
      status.auth = parseNativeAuth(harness, 0, result.stdout, result.stderr);
    } catch (error) {
      const result = error as { code?: unknown; stdout?: string; stderr?: string };
      status.auth = parseNativeAuth(harness, typeof result.code === 'number' ? result.code : null, result.stdout || '', result.stderr || '');
    }
    status.reason = status.auth === 'authenticated' ? null : status.auth === 'not_authenticated' ? 'Sign in using the CLI itself, then check again. ContextDrop does not handle CLI credentials.' : 'Native login status could not be established. Check authentication in the CLI itself.';
  } catch { status.reason = 'CLI metadata could not be read. Check the local installation.'; }
  return status;
}

/** Read installed CLI metadata only; never authenticate or start an AI session. */
export async function resolveInstalledHarnesses(env: NodeJS.ProcessEnv = process.env): Promise<{ codexBinary?: string; claudeBinary?: string }> {
  async function inspect(binary: string, name: Harness) {
    if (!path.isAbsolute(binary) || /[\r\n\u0000]/.test(binary)) throw new Error('Expected an absolute executable path');
    if (!(await fs.stat(binary)).isFile()) throw new Error('Expected an executable file');
    await fs.access(binary, constants.X_OK);
    const commandOptions = { cwd: os.tmpdir(), env: runnerEnvironment(env), timeout: 10_000, maxBuffer: 128_000 };
    const version = await execute(binary, ['--version'], commandOptions);
    if (name === 'codex' && !/^codex-cli \d+\.\d+\.\d+/m.test(version.stdout)) throw new Error('The selected binary did not identify itself as Codex CLI');
    const { stdout } = await execute(binary, ['--help'], commandOptions);
    if (name === 'claude') {
      if (!claudeFlags.every(flag => stdout.includes(flag))) throw new Error('Claude Code is missing the required inspection controls');
    } else {
      const help = await execute(binary, ['exec', '--help'], commandOptions);
      if (!['--approve-for-me', '--no-alt-screen'].every(flag => stdout.includes(flag)) || !codexExecFlags.every(flag => help.stdout.includes(flag))) throw new Error('Codex CLI is missing required runner options');
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
