import type { LocalRunState } from "@/components/dashboard/BrowserSession";

export interface PersonalRun extends LocalRunState {
  executor: "browser" | "terminal";
  analysisId: string;
  sourceUrl: string;
  title: string;
  goal: string;
  createdAt: string;
  harness?: "codex" | "claude";
  terminalMode?: "exec" | "interactive";
  canStop: boolean;
  canResume: boolean;
}

export interface RunOutput {
  id: string;
  mode: "streaming" | "interactive" | "browser";
  log: { text: string; truncated: boolean; updatedAt: string | null };
  result: { text: string; path: string | null; source: "report" | "last_message" | null; verification: "unverified"; truncated: boolean };
}

export function runIsActive(status: string): boolean {
  return ["launching", "running", "awaiting_approval", "needs_input", "stopping"].includes(status);
}

export function runStatusLabel(status: string): string {
  return ({ launching: "Starting", running: "Working", awaiting_approval: "Needs your approval", needs_input: "Needs your input", stopping: "Stopping", stopped: "Stopped", failed: "Needs attention", interrupted: "Interrupted", finished_unverified: "Finished · review the result" } as Record<string, string>)[status] ?? "Status unavailable";
}

/** Never infer success from a process exit, a report, or a missing run. */
export function latestSourceRun(runs: PersonalRun[], analysisId: string): PersonalRun | undefined {
  return runs.filter(run => run.analysisId === analysisId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}
