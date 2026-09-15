// Fixed policy, checked against Codex 0.154 CLI help/config schema and Claude
// Code 2.1.259 help. No project-provided configuration enters these arguments.
// https://learn.chatgpt.com/docs/config-file/config-reference
// https://code.claude.com/docs/en/cli-reference
export const CONNECTION_IDS = Object.freeze(['github', 'vercel']);

export function parseConnectionIds(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > CONNECTION_IDS.length ||
      [...value].some(id => typeof id !== 'string' || !CONNECTION_IDS.includes(id)) ||
      new Set(value).size !== value.length) {
    throw new Error('Select unique curated connection IDs: github or vercel');
  }
  return [...value].sort();
}

export function modeUnavailableReason(harness, mode) {
  if (harness === 'claude' && mode !== 'interactive') return 'Claude Code background execution is unavailable; this companion supports native interactive inspection only.';
  if (harness === 'codex' && mode !== 'exec') return 'Isolated interactive Codex is unavailable: the installed CLI exposes --ignore-user-config only for exec. Configure CONTEXTDROP_TERMINAL_MODE=exec locally.';
  return null;
}

export function connectionUnavailableReason(harness) {
  return harness === 'claude'
    ? 'Claude safe mode disables MCP. A curated MCP launch retaining native authorization and excluding all customizations has not been validated; Codex Apps authorization cannot be reused by Claude.'
    : 'Uses your existing Codex connections. Availability and permissions are checked inside the task; a CLI sign-in alone does not prove a service is connected.';
}

export function assertExecutionSelection(harness, mode, value) {
  if (!['codex', 'claude'].includes(harness)) throw new Error('Unknown coding harness');
  const ids = parseConnectionIds(value);
  const reason = modeUnavailableReason(harness, mode);
  if (reason) throw new Error(reason);
  if (ids.length && harness !== 'codex') throw new Error(connectionUnavailableReason(harness));
  return ids;
}

/** Native CLI auth stays in its own store. Never forward service credentials. */
export function runnerEnvironment(source = process.env) {
  // This is environment isolation. It does not add a filesystem deny-read
  // boundary to either CLI; do not present it as full credential isolation.
  const inherited = new Set(['PATH', 'HOME', 'USER', 'LOGNAME', 'TERM', 'COLORTERM', 'TMPDIR', 'LANG', 'CODEX_HOME']);
  return Object.fromEntries(Object.entries(source).filter(([key, value]) => typeof value === 'string' && (inherited.has(key) || /^LC_[A-Z_]+$/.test(key))));
}

export function codexPolicyArgs(workspace, connectionIds = []) {
  const nativeApps = parseConnectionIds(connectionIds).length > 0;
  // Native Apps retain user-owned authorization. Selected IDs describe task
  // intent, not a filesystem or per-tool security sandbox. Hooks and source
  // instructions remain disabled; the task must verify callable tools itself.
  const settings = [
    // The CLI reads its native keyring/file stores; ContextDrop never copies
    // their contents. Use the same backend for login metadata and execution.
    'cli_auth_credentials_store="auto"',
    'allow_login_shell=false',
    'shell_environment_policy.experimental_use_profile=false',
    'shell_environment_policy.inherit="core"',
    'shell_environment_policy.ignore_default_excludes=false',
    'sandbox_workspace_write.network_access=true',
    'features.hooks=false', `features.plugins=${nativeApps}`, `features.remote_plugin=${nativeApps}`,
    `features.apps=${nativeApps}`, 'features.memories=false', 'features.shell_snapshot=false',
    'skills.include_instructions=false', 'project_doc_max_bytes=0',
    `projects={${JSON.stringify(workspace)}={trust_level="untrusted"}}`,
  ];
  return ['--ignore-rules', '--strict-config', ...settings.flatMap(setting => ['-c', setting])];
}
