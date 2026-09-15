import type { LocalRunState } from "@/components/dashboard/BrowserSession";

export interface PersonalRun extends LocalRunState {
  executor: "browser" | "terminal";
  analysisId: string;
  sourceUrl: string;
  title: string;
  goal: string;
  createdAt: string;
  updatedAt?: string;
  harness?: "codex" | "claude";
  terminalMode?: "exec" | "interactive";
  canStop: boolean;
  canResume: boolean;
}

export interface RunOutput {
  id: string;
  mode: "streaming" | "interactive" | "browser";
  log: { text: string; truncated: boolean; updatedAt: string | null };
  progress?: { phase: 'starting' | 'reading' | 'building' | 'checking' | 'working' | 'wrapping_up'; update: string | null; updatedAt: string | null };
  result: { text: string; path: string | null; source: "report" | "last_message" | null; verification: "unverified"; truncated: boolean };
}

export function taskStatusLabel(run: Pick<PersonalRun, "status" | "terminalMode">, output: RunOutput | null): string {
  if (run.status !== "running") return runStatusLabel(run.status);
  if (run.terminalMode === "interactive") return "Continue in Terminal";
  if (output?.result.text.trim()) return "Wrapping up";
  return ({ starting: "Starting", reading: "Reading the task", building: "Building", checking: "Checking the result", working: "Working", wrapping_up: "Wrapping up" })[output?.progress?.phase ?? "working"];
}

export function taskElapsed(run: Pick<PersonalRun, "status" | "createdAt" | "updatedAt">, now = Date.now()): string {
  const start = Date.parse(run.createdAt);
  const end = runIsActive(run.status) ? now : Date.parse(run.updatedAt || run.createdAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "";
  const seconds = Math.max(0, Math.floor((end - start) / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

export function taskResultPreview(text: string): string {
  const first = text.split(/\n\s*\n/).map(block => block.replace(/^(?:#{1,6} [^\n]*(?:\n|$))+/, "").trim()).find(Boolean) ?? "";
  return first.length > 800 ? `${first.slice(0, 797).replace(/\s+\S*$/, "")}…` : first;
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
