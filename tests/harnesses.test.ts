import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { inspectHarnessStatus, parseNativeAuth, resolveInstalledHarnesses } from '../companion/harnesses.js';
import { inspectConnections, inspectCuratedDefinition } from '../companion/connections.js';

test('a trusted explicit Codex binary is inspected without authenticating or starting a session', async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'contextdrop-cli-override-'));
  const binary = path.join(folder, 'fixture-codex.mjs');
  const calls = path.join(folder, 'metadata-calls.jsonl');
  try {
    await fs.writeFile(binary, `#!${process.execPath}\nimport fs from 'node:fs';\nconst args=process.argv.slice(2);fs.appendFileSync(${JSON.stringify(calls)},JSON.stringify(args)+'\\n');\nif(args[0]==='--version')console.log('codex-cli 0.154.0-alpha.6.2');else if(args.join(' ')==='exec --help')console.log('--sandbox --cd --skip-git-repo-check --ignore-user-config --ignore-rules --strict-config --json --output-last-message');else if(args[0]==='--help')console.log('--approve-for-me --no-alt-screen');else process.exitCode=9;\n`, { mode: 0o700 });
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

test('native authentication metadata never treats missing or malformed fields as authenticated', () => {
  assert.equal(parseNativeAuth('codex', 0, '', 'Logged in using ChatGPT'), 'authenticated');
  assert.equal(parseNativeAuth('codex', 1, 'Not logged in'), 'not_authenticated');
  assert.equal(parseNativeAuth('claude', 0, '{"loggedIn":true,"email":"private@example.com"}'), 'authenticated');
  assert.equal(parseNativeAuth('claude', 1, '{"loggedIn":false}'), 'not_authenticated');
  for (const output of ['', '{}', 'null', '[]', '{"loggedIn":"true"}', 'secret diagnostic']) {
    assert.equal(parseNativeAuth('claude', 0, output), 'unknown');
    assert.equal(parseNativeAuth('codex', 0, output), 'unknown');
  }
  assert.equal(parseNativeAuth('claude', null, '{"loggedIn":true}'), 'unknown');
  assert.equal(parseNativeAuth('codex', 2, 'Logged in using ChatGPT'), 'unknown');
});

test('setup metadata separates curated configuration from auth and supported execution', async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'contextdrop-setup-metadata-'));
  const binary = path.join(folder, 'claude');
  const calls = path.join(folder, 'calls.jsonl');
  try {
    await fs.writeFile(binary, `#!${process.execPath}\nimport fs from 'node:fs';const args=process.argv.slice(2);fs.appendFileSync(${JSON.stringify(calls)},JSON.stringify({args,secret:process.env.ANTHROPIC_API_KEY,helper:process.env.NODE_OPTIONS})+'\\n');if(args[0]==='--version')console.log('2.1.259 (Claude Code)');else if(args[0]==='--help')console.log('--safe-mode --permission-mode --no-chrome --name --setting-sources');else if(args.join(' ')==='--safe-mode --setting-sources  auth status --json'){console.log(JSON.stringify({loggedIn:false,email:'private@example.com',token:'private-sentinel'}));process.exitCode=1}else process.exitCode=7;`, { mode: 0o700 });
    await fs.writeFile(path.join(folder, '.claude.json'), JSON.stringify({ privateField: 'private-sentinel', mcpServers: { github: { type: 'http', url: 'https://api.githubcopilot.com/mcp/' }, vercel: { type: 'http', url: 'https://mcp.vercel.com', headers: { Authorization: 'private-sentinel' } } } }));
    const env = { HOME: folder, PATH: folder, ANTHROPIC_API_KEY: 'private-sentinel', NODE_OPTIONS: '--no-warnings' };
    const setup = await inspectConnections({ claudeBinary: binary, terminalMode: 'exec', platform: 'darwin' }, env);
    assert.equal(setup.harnesses.claude.installed, true);
    assert.equal(setup.harnesses.claude.auth, 'not_authenticated');
    assert.equal(setup.harnesses.claude.available, false);
    assert.equal(setup.harnesses.codex.installed, false);
    assert.equal(setup.harnesses.codex.available, false);
    assert.equal(setup.connections[0].harnesses.claude.configuration, 'configured');
    assert.equal(setup.connections[1].harnesses.claude.configuration, 'unsafe');
    for (const connection of setup.connections) for (const status of Object.values(connection.harnesses)) {
      assert.equal(status.auth, 'unknown'); assert.equal(status.connected, null); assert.equal(status.selectable, false);
    }
    assert.ok(!JSON.stringify(setup).includes('private-sentinel'));
    assert.ok(!JSON.stringify(setup).includes('private@example.com'));
    const probes = (await fs.readFile(calls, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    assert.deepEqual(probes.map(probe => probe.args), [['--version'], ['--help'], ['--safe-mode', '--setting-sources', '', 'auth', 'status', '--json']]);
    assert.ok(probes.every(probe => probe.secret === undefined && probe.helper === undefined));
    const installedOnly = await inspectHarnessStatus('/usr/bin/true', 'codex', env);
    assert.equal(installedOnly.installed, false); assert.equal(installedOnly.auth, 'unknown');
  } finally { await fs.rm(folder, { recursive: true, force: true }); }
});

test('curated definitions exclude commands, headers, environment mappings and URL tricks', () => {
  const valid = { type: 'http', url: 'https://mcp.vercel.com' };
  assert.equal(inspectCuratedDefinition('vercel', valid), 'configured');
  assert.equal(inspectCuratedDefinition('vercel', undefined), 'not_configured');
  for (const value of [null, [], { ...valid, command: 'echo' }, { ...valid, env: {} }, { ...valid, headers: {} }, { ...valid, oauth: {} }, { ...valid, url: `${valid.url}/evil` }, { ...valid, url: 'https://mcp.vercel.com@evil.example' }, { ...valid, url: 'https://mcp.vercel.com?token=secret' }]) assert.equal(inspectCuratedDefinition('vercel', value), 'unsafe');
});
