import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { inspectHarnessStatus, type Harness, type HarnessStatus } from './harnesses.js';
import { CONNECTION_IDS, connectionUnavailableReason, modeUnavailableReason } from './execution-policy.mjs';

export type ConnectionId = 'github' | 'vercel';
type Configuration = 'configured' | 'not_configured' | 'unsafe' | 'unknown';
const endpoints = { github: 'https://api.githubcopilot.com/mcp/', vercel: 'https://mcp.vercel.com' } as const;

/** Only exact, credential-free HTTP definitions qualify as curated metadata.
 * Nothing from these definitions is forwarded to a runner. */
export function inspectCuratedDefinition(id: ConnectionId, value: unknown): Configuration {
  if (value === undefined) return 'not_configured';
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'unsafe';
  const definition = value as Record<string, unknown>;
  if (Object.keys(definition).some(key => key !== 'type' && key !== 'url') || definition.type !== 'http' || definition.url !== endpoints[id]) return 'unsafe';
  return 'configured';
}

async function claudeConfiguration(home: string): Promise<Record<ConnectionId, Configuration>> {
  const unknown = { github: 'unknown', vercel: 'unknown' } as const;
  try {
    const filename = path.join(home, '.claude.json');
    const stat = await fs.lstat(filename);
    if (!stat.isFile() || stat.size > 1024 * 1024) return unknown;
    const config = JSON.parse(await fs.readFile(filename, 'utf8'));
    if (!config || typeof config !== 'object' || Array.isArray(config)) return unknown;
    const servers = config.mcpServers;
    if (servers !== undefined && (!servers || typeof servers !== 'object' || Array.isArray(servers))) return unknown;
    return { github: inspectCuratedDefinition('github', servers?.github), vercel: inspectCuratedDefinition('vercel', servers?.vercel) };
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ENOENT' ? { github: 'not_configured', vercel: 'not_configured' } : unknown;
  }
}

export interface SetupStatus {
  version: 1;
  checkedAt: string;
  harnesses: Record<Harness, HarnessStatus & {
    mode: 'exec' | 'interactive';
    available: boolean;
    unavailableReason: string | null;
  }>;
  connections: {
    id: ConnectionId;
    name: string;
    harnesses: Record<Harness, { configuration: Configuration; auth: 'unknown'; connected: null; selectable: boolean; reason: string }>;
  }[];
}

export async function inspectConnections(options: { codexBinary?: string; claudeBinary?: string; terminalMode?: 'exec' | 'interactive'; platform?: string }, env: NodeJS.ProcessEnv = process.env): Promise<SetupStatus> {
  // These probes are small, sequential, and never connect to a model or an MCP
  // server. CLI authentication is independent from each connection's auth.
  const codex = await inspectHarnessStatus(options.codexBinary, 'codex', env);
  const claude = await inspectHarnessStatus(options.claudeBinary, 'claude', env);
  const configuration = await claudeConfiguration(env.HOME || os.homedir());
  function harnessStatus(harness: Harness, status: HarnessStatus, mode: 'exec' | 'interactive') {
    const unavailableReason = (options.platform || process.platform) !== 'darwin' ? 'The local coding companion currently requires macOS.'
      : modeUnavailableReason(harness, mode) || (!status.installed || !status.supported || status.auth !== 'authenticated' ? status.reason || 'Native CLI readiness is unverified.' : null);
    return { ...status, mode, available: unavailableReason === null, unavailableReason };
  }
  return {
    version: 1, checkedAt: new Date().toISOString(),
    harnesses: { codex: harnessStatus('codex', codex, options.terminalMode || 'interactive'), claude: harnessStatus('claude', claude, 'interactive') },
    connections: CONNECTION_IDS.map(id => ({
      id, name: id === 'github' ? 'GitHub' : 'Vercel',
      harnesses: {
        // Installed Codex Apps are not direct MCP entries. Native login status
        // cannot establish their configuration, authorization or exec tools.
        codex: { configuration: 'unknown', auth: 'unknown', connected: null, selectable: harnessStatus('codex', codex, options.terminalMode || 'interactive').available, reason: connectionUnavailableReason('codex') },
        claude: { configuration: configuration[id], auth: 'unknown', connected: null, selectable: false, reason: connectionUnavailableReason('claude') },
      },
    })),
  };
}
