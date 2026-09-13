import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveInstalledHarnesses } from '../companion/harnesses.js';

test('a trusted explicit Codex binary is inspected without authenticating or starting a session', async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'contextdrop-cli-override-'));
  const binary = path.join(folder, 'fixture-codex.mjs');
  const calls = path.join(folder, 'metadata-calls.jsonl');
  try {
    await fs.writeFile(binary, `#!${process.execPath}\nimport fs from 'node:fs';\nconst args=process.argv.slice(2);fs.appendFileSync(${JSON.stringify(calls)},JSON.stringify(args)+'\\n');\nif(args[0]==='--version')console.log('codex-cli 0.154.0-alpha.6.2');else if(args.join(' ')==='exec --help')console.log('--sandbox --cd --skip-git-repo-check --ignore-user-config --json --output-last-message');else if(args[0]==='--help')console.log('--ask-for-approval --no-alt-screen');else process.exitCode=9;\n`, { mode: 0o700 });
    const resolved = await resolveInstalledHarnesses({ CONTEXTDROP_CODEX_BINARY: binary, PATH: folder });
    assert.equal(resolved.codexBinary, binary);
    assert.deepEqual((await fs.readFile(calls, 'utf8')).trim().split('\n').map(line => JSON.parse(line)), [['--version'], ['--help'], ['exec', '--help']]);
    // An explicit broken path must not silently fall back to a different global CLI.
    for (const override of ['', 'relative/codex', path.join(folder, 'missing'), folder, `${binary}\n`]) {
      await assert.rejects(resolveInstalledHarnesses({ CONTEXTDROP_CODEX_BINARY: override, PATH: folder }), /CONTEXTDROP_CODEX_BINARY/);
    }
    await fs.writeFile(binary, `#!${process.execPath}\nconsole.log(process.argv.includes('--version')?'codex-cli 0.100.0':'--json');\n`, { mode: 0o700 });
    await assert.rejects(resolveInstalledHarnesses({ CONTEXTDROP_CODEX_BINARY: binary, PATH: folder }), /required sandbox, approval and exec options/);
  } finally { await fs.rm(folder, { recursive: true, force: true }); }
});
