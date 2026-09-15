import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
const execute = promisify(execFile);

async function fixture(mode: 'exec' | 'interactive', exitCode = 0, harness: 'codex' | 'claude' = 'codex') {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'contextdrop-runner-check-'));
  const workspace = path.join(folder, 'project');
  const control = path.join(folder, 'control');
  await fs.mkdir(workspace); await fs.mkdir(control);
  const binary = path.join(folder, 'fake-codex');
  await fs.writeFile(binary, `#!${process.execPath}\nimport fs from 'node:fs';\nconst argv=process.argv.slice(2);fs.writeFileSync(${JSON.stringify(path.join(control, 'argv.json'))},JSON.stringify(argv));\nfs.writeFileSync(${JSON.stringify(path.join(control, 'environment-keys.json'))},JSON.stringify(Object.keys(process.env)));\nconst index=argv.indexOf('--output-last-message');if(index>=0)fs.writeFileSync(argv[index+1],'Fixture report; review the artifact.');\nconsole.log(JSON.stringify({type:'item.started',item:{type:'command_execution',command:'printf fixture'}}));\nconsole.log(JSON.stringify({type:'item.completed',item:{type:'command_execution',aggregated_output:'fixture output',exit_code:0}}));\nconsole.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'Reported result \\u001b]0;untrusted title\\u0007'}}));\nconsole.log(JSON.stringify({type:'turn.completed'}));console.error('fixture diagnostic');process.exitCode=${exitCode};\n`, { mode: 0o700 });
  // This folder is outside the repository, so tell Node to treat the fixture as ESM.
  await fs.writeFile(path.join(folder, 'package.json'), '{"type":"module"}');
  const config = path.join(control, 'runner.json');
  await fs.writeFile(config, JSON.stringify({ id: 'fixture-run', workspace, ...(harness === 'claude' ? { harness, claudeBinary: binary } : { codexBinary: binary }), terminalMode: mode, ...(mode === 'exec' && harness === 'codex' ? { codexModel: 'gpt-5.4-mini' } : {}) }));
  return { folder, workspace, control, config };
}

test('opt-in exec runner uses fixed sandboxed argv, streams progress and saves logs outside project', async () => {
  const f = await fixture('exec');
  try {
    const result = await execute(process.execPath, ['companion/runner.mjs', f.config], { cwd: process.cwd(), timeout: 15_000 });
    const args = JSON.parse(await fs.readFile(path.join(f.control, 'argv.json'), 'utf8'));
    assert.deepEqual(args.slice(0, 7), ['--approve-for-me', 'exec', '-C', f.workspace, '-s', 'workspace-write', '--skip-git-repo-check']);
    assert.ok(args.includes('--json'));
    assert.ok(args.includes('--ignore-user-config'));
    assert.equal(args[args.indexOf('-m') + 1], 'gpt-5.4-mini');
    assert.equal(args[args.indexOf('--output-last-message') + 1], path.join(f.control, 'last-message.md'));
    assert.ok(!args.some((arg: string) => /bypass|danger-full-access|full-auto/.test(arg)));
    assert.match(result.stdout, /fixture output/); assert.match(result.stdout, /Reported result/); assert.ok(!result.stdout.includes('\u001b'));
    const state = JSON.parse(await fs.readFile(path.join(f.control, 'status.json'), 'utf8'));
    assert.equal(state.status, 'finished_unverified'); assert.equal(state.exitCode, 0);
    const events = (await fs.readFile(path.join(f.control, 'codex-events.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    assert.equal(events.at(-1).type, 'turn.completed');
    assert.match(await fs.readFile(path.join(f.control, 'codex-stderr.log'), 'utf8'), /fixture diagnostic/);
    assert.deepEqual(await fs.readdir(f.workspace), []);
  } finally { await fs.rm(f.folder, { recursive: true, force: true }); }
});

test('Claude handoff preserves local auth environment and starts a fixed interactive inspection', async () => {
  const f = await fixture('interactive', 0, 'claude');
  try {
    const forbidden = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'CLAUDE_CODE_OAUTH_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY', 'CONTEXTDROP_COMPANION_TOKEN', 'NODE_OPTIONS', 'CLAUDE_CODE_DANGEROUSLY_SKIP_PERMISSIONS'];
    const env = { ...process.env, ...Object.fromEntries(forbidden.map(key => [key, `fixture-sentinel-${key}`])) };
    // A valid parent Node option must still be absent from the harness child.
    env.NODE_OPTIONS = '--no-warnings';
    await execute(process.execPath, ['companion/runner.mjs', f.config], { cwd: process.cwd(), timeout: 15_000, env });
    const args = JSON.parse(await fs.readFile(path.join(f.control, 'argv.json'), 'utf8'));
    assert.deepEqual(args.slice(0, 6), ['--safe-mode', '--permission-mode', 'plan', '--no-chrome', '--name', 'ContextDrop inspection']);
    assert.equal(args.length, 9);
    assert.deepEqual(args.slice(6, 8), ['--setting-sources', '']);
    assert.match(args[8], /Do not install dependencies, clone repositories, run project code/);
    assert.ok(!args.some((arg: string) => /^(--bare|--print|-p|--dangerously-skip-permissions|--allowedTools|--chrome)$/.test(arg)));
    const keys: string[] = JSON.parse(await fs.readFile(path.join(f.control, 'environment-keys.json'), 'utf8'));
    for (const key of forbidden) assert.ok(!keys.includes(key), `${key} leaked to Claude`);
    for (const key of ['PATH', 'HOME']) assert.ok(keys.includes(key), `${key} should support signed-in local CLI`);
    const status = JSON.parse(await fs.readFile(path.join(f.control, 'status.json'), 'utf8'));
    assert.equal(status.harness, 'claude'); assert.equal(status.status, 'finished_unverified');
    assert.deepEqual(await fs.readdir(f.workspace), []);
  } finally { await fs.rm(f.folder, { recursive: true, force: true }); }
});

test('Claude handoff fails closed on noninteractive config and reports a nonzero CLI exit', async () => {
  for (const [mode, exitCode] of [['exec', 0], ['interactive', 7]] as const) {
    const f = await fixture(mode, exitCode, 'claude');
    try {
      await assert.rejects(execute(process.execPath, ['companion/runner.mjs', f.config], { cwd: process.cwd(), timeout: 15_000 }));
      if (mode === 'exec') {
        await assert.rejects(fs.access(path.join(f.control, 'argv.json')));
      } else {
        const status = JSON.parse(await fs.readFile(path.join(f.control, 'status.json'), 'utf8'));
        assert.equal(status.harness, 'claude'); assert.equal(status.status, 'failed'); assert.equal(status.exitCode, 7);
      }
    } finally { await fs.rm(f.folder, { recursive: true, force: true }); }
  }
});

test('exec nonzero exit is a failed run even if a report was written', async () => {
  const f = await fixture('exec', 7);
  try {
    await assert.rejects(execute(process.execPath, ['companion/runner.mjs', f.config], { cwd: process.cwd(), timeout: 15_000 }));
    const state = JSON.parse(await fs.readFile(path.join(f.control, 'status.json'), 'utf8'));
    assert.equal(state.status, 'failed'); assert.equal(state.exitCode, 7);
  } finally { await fs.rm(f.folder, { recursive: true, force: true }); }
});

test('an explicit failed Codex turn is not reported as finished when its CLI exits zero', async () => {
  const f = await fixture('exec');
  try {
    await fs.writeFile(path.join(f.folder, 'fake-codex'), `#!${process.execPath}\nconsole.log(JSON.stringify({type:'turn.failed',error:{message:'Fixture permission cannot be requested noninteractively'}}));\n`, { mode: 0o700 });
    await assert.rejects(execute(process.execPath, ['companion/runner.mjs', f.config], { cwd: process.cwd(), timeout: 15_000 }));
    const state = JSON.parse(await fs.readFile(path.join(f.control, 'status.json'), 'utf8'));
    assert.equal(state.status, 'failed'); assert.equal(state.exitCode, 0);
    assert.match(state.error, /cannot be requested noninteractively/);
  } finally { await fs.rm(f.folder, { recursive: true, force: true }); }
});

test('a stopped launch cannot start the coding agent when Terminal eventually opens', async () => {
  const f = await fixture('exec');
  try {
    await fs.writeFile(path.join(f.control, 'stop-request.json'), JSON.stringify({ id: 'fixture-run' }));
    await execute(process.execPath, ['companion/runner.mjs', f.config], { cwd: process.cwd(), timeout: 15_000 });
    const state = JSON.parse(await fs.readFile(path.join(f.control, 'status.json'), 'utf8'));
    assert.equal(state.status, 'stopped');
    await assert.rejects(fs.access(path.join(f.control, 'argv.json')));
  } finally { await fs.rm(f.folder, { recursive: true, force: true }); }
});

test('closing Terminal stops its owned exec process group instead of abandoning background work', async () => {
  const f = await fixture('exec');
  const marker = path.join(f.control, 'fixture-ready');
  await fs.writeFile(path.join(f.folder, 'fake-codex'), `#!${process.execPath}\nimport fs from 'node:fs';\nfs.writeFileSync(${JSON.stringify(marker)},'ready');process.on('SIGTERM',()=>process.exit(0));setInterval(()=>{},1000);\n`, { mode: 0o700 });
  const runner = spawn(process.execPath, ['companion/runner.mjs', f.config], { cwd: process.cwd(), stdio: 'ignore' });
  const exited = new Promise<void>(resolve => runner.once('close', () => resolve()));
  try {
    const deadline = Date.now() + 5000;
    while (!await fs.access(marker).then(() => true, () => false)) {
      assert.ok(Date.now() < deadline, 'Fixture coding agent did not start');
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    runner.kill('SIGHUP');
    await Promise.race([exited, new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new Error('Runner did not stop after Terminal hangup')), 7000); timer.unref(); })]);
    const state = JSON.parse(await fs.readFile(path.join(f.control, 'status.json'), 'utf8'));
    assert.equal(state.status, 'stopped');
  } finally { runner.kill('SIGTERM'); await exited; await fs.rm(f.folder, { recursive: true, force: true }); }
});

test('interactive Codex fails closed because it cannot ignore user config', async () => {
  const f = await fixture('interactive');
  try {
    await assert.rejects(execute(process.execPath, ['companion/runner.mjs', f.config], { cwd: process.cwd(), timeout: 15_000 }), /Isolated interactive Codex is unavailable/);
    await assert.rejects(fs.access(path.join(f.control, 'argv.json')));
  } finally { await fs.rm(f.folder, { recursive: true, force: true }); }
});

test('Codex exec does not pass worker secrets or shell startup controls', async () => {
  const forbidden = ['OPENAI_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL', 'JWT_SECRET', 'WHATSAPP_TOKEN', 'CONTEXTDROP_COMPANION_TOKEN', 'UNLISTED_FUTURE_SECRET', 'BASH_ENV', 'ENV', 'ZDOTDIR', 'SHELL'];
  for (const mode of ['exec'] as const) {
    const f = await fixture(mode);
    try {
      const env = { ...process.env, TERM: 'xterm-256color', LC_MESSAGES: 'C', ...Object.fromEntries(forbidden.map(key => [key, `fixture-sentinel-${key}`])) };
      await execute(process.execPath, ['companion/runner.mjs', f.config], { cwd: process.cwd(), timeout: 15_000, env });
      const keys: string[] = JSON.parse(await fs.readFile(path.join(f.control, 'environment-keys.json'), 'utf8'));
      for (const key of forbidden) assert.ok(!keys.includes(key), `${key} leaked to ${mode} child`);
      for (const key of ['PATH', 'HOME', 'TERM', 'LC_MESSAGES']) assert.ok(keys.includes(key), `${key} should support the local CLI`);
    } finally { await fs.rm(f.folder, { recursive: true, force: true }); }
  }
});

test('runner rejects unknown connections and injected definitions before starting a CLI', async () => {
  const f = await fixture('exec');
  const original = JSON.parse(await fs.readFile(f.config, 'utf8'));
  try {
    for (const change of [{ connectionIds: ['evil'] }, { connectionIds: ['github', 'github'] }, { connectionIds: [{ id: 'github', command: 'sh' }] }, { connectionIds: null }, { mcpServers: { evil: { command: 'sh' } } }]) {
      await fs.writeFile(f.config, JSON.stringify({ ...original, ...change }));
      await assert.rejects(execute(process.execPath, ['companion/runner.mjs', f.config], { cwd: process.cwd(), timeout: 15_000 }));
      await assert.rejects(fs.access(path.join(f.control, 'argv.json')));
    }
  } finally { await fs.rm(f.folder, { recursive: true, force: true }); }
});

test('Codex policy blocks ambient apps, plugins, hooks, rules and login shell profiles', async () => {
  const f = await fixture('exec');
  try {
    await execute(process.execPath, ['companion/runner.mjs', f.config], { cwd: process.cwd(), timeout: 15_000 });
    const args: string[] = JSON.parse(await fs.readFile(path.join(f.control, 'argv.json'), 'utf8'));
    assert.ok(args.includes('--ignore-rules')); assert.ok(args.includes('--strict-config'));
    for (const setting of ['allow_login_shell=false', 'shell_environment_policy.experimental_use_profile=false', 'features.hooks=false', 'features.plugins=false', 'features.apps=false', 'features.remote_plugin=false', 'features.shell_snapshot=false', 'skills.include_instructions=false', 'project_doc_max_bytes=0']) assert.ok(args.includes(setting), setting);
    assert.ok(args.includes(`projects={${JSON.stringify(f.workspace)}={trust_level="untrusted"}}`));
    const status = JSON.parse(await fs.readFile(path.join(f.control, 'status.json'), 'utf8'));
    assert.deepEqual(status.connectionIds, []);
  } finally { await fs.rm(f.folder, { recursive: true, force: true }); }
});

test('a reviewed connection request enables native Apps without forwarding tokens or enabling hooks', async () => {
  const f = await fixture('exec');
  try {
    const config = JSON.parse(await fs.readFile(f.config, 'utf8'));
    await fs.writeFile(f.config, JSON.stringify({ ...config, connectionIds: ['vercel', 'github'] }));
    await execute(process.execPath, ['companion/runner.mjs', f.config], { cwd: process.cwd(), timeout: 15_000 });
    const args: string[] = JSON.parse(await fs.readFile(path.join(f.control, 'argv.json'), 'utf8'));
    assert.ok(args.includes('features.apps=true'));
    assert.ok(args.includes('features.hooks=false'));
    assert.ok(args.includes('--ignore-user-config'));
    const status = JSON.parse(await fs.readFile(path.join(f.control, 'status.json'), 'utf8'));
    assert.deepEqual(status.connectionIds, ['github', 'vercel']);
  } finally { await fs.rm(f.folder, { recursive: true, force: true }); }
});
