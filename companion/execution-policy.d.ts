// Match both companion and test imports of the native Node policy module.
declare module '*execution-policy.mjs' {
  type Harness = 'codex' | 'claude';
  type ConnectionId = 'github' | 'vercel';
  export const CONNECTION_IDS: readonly ['github', 'vercel'];
  export function parseConnectionIds(value: unknown): ConnectionId[];
  export function modeUnavailableReason(harness: Harness, mode: unknown): string | null;
  export function connectionUnavailableReason(harness: Harness): string;
  export function assertExecutionSelection(harness: unknown, mode: unknown, value: unknown): ConnectionId[];
  export function runnerEnvironment(source?: NodeJS.ProcessEnv): NodeJS.ProcessEnv;
  export function codexPolicyArgs(workspace: string, connectionIds?: ('github' | 'vercel')[]): string[];
}
