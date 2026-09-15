const stages = {
  pending: "Waiting to start…",
  scraping: "Opening your link…",
  transcribing: "Listening…",
  analyzing: "Reading your content…",
  generating: "Getting your answer ready…",
  done: "Your content is ready",
  failed: "We couldn’t read this content.",
} as const;

export type AnalysisStage = keyof typeof stages;
export interface AnalysisProgress {
  status: AnalysisStage;
  message: string;
  delayed: boolean;
  refunded: boolean;
}

/** Time alone never changes a job's state or proves that a charge was refunded. */
export function analysisProgress(row: {
  status: string;
  created_at?: string | null;
  credits_reserved_at?: string | null;
  credits_refunded_at?: string | null;
}, now = Date.now()): AnalysisProgress {
  if (!Object.hasOwn(stages, row.status)) throw new Error("Unknown analysis state");
  const status = row.status as AnalysisStage;
  const delayed = status === "pending" && now - Date.parse(row.created_at || "") > 120_000;
  const refunded = status === "failed" && !!row.credits_refunded_at;
  return {
    status, delayed, refunded,
    message: status === "failed"
      ? `We couldn’t read this content.${refunded ? " Your credit was returned." : row.credits_reserved_at ? " Your credit return is pending." : ""}`
      : delayed ? "Your link is saved. Waiting for the reader to start…" : stages[status],
  };
}

export function parseAnalysisProgress(value: unknown): AnalysisProgress {
  if (!value || typeof value !== "object") throw new Error("Invalid analysis status");
  const item = value as Record<string, unknown>;
  if (typeof item.status !== "string" || !Object.hasOwn(stages, item.status)
    || typeof item.message !== "string" || item.message.length > 500
    || typeof item.delayed !== "boolean" || typeof item.refunded !== "boolean") {
    throw new Error("Invalid analysis status");
  }
  return item as unknown as AnalysisProgress;
}

export class AnalysisPollError extends Error {
  constructor(public readonly kind: "sign-in" | "missing" | "connection" | "waiting", message: string) { super(message); }
}

/** Serial requests avoid overlapping polls. Losing the connection never starts another job. */
export async function watchAnalysis(id: string, options: {
  signal: AbortSignal;
  onProgress: (progress: AnalysisProgress) => void;
  fetchImpl?: typeof fetch;
  pause?: (ms: number, signal: AbortSignal) => Promise<void>;
  maxChecks?: number;
}) {
  const fetcher = options.fetchImpl ?? fetch;
  const pause = options.pause ?? ((ms, signal) => new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, ms);
    signal.addEventListener("abort", abort, { once: true });
  }));
  let failures = 0;
  for (let check = 0; check < (options.maxChecks ?? 400); check++) {
    options.signal.throwIfAborted();
    try {
      const response = await fetcher(`/api/analyze/${encodeURIComponent(id)}/status`, {
        cache: "no-store", signal: AbortSignal.any([options.signal, AbortSignal.timeout(15_000)]),
      });
      if (response.status === 401) throw new AnalysisPollError("sign-in", "Sign in again to check your saved link.");
      if (response.status === 404) throw new AnalysisPollError("missing", "This saved link is no longer available.");
      if (!response.ok) throw new Error("Status unavailable");
      const progress = parseAnalysisProgress(await response.json());
      options.signal.throwIfAborted();
      options.onProgress(progress);
      failures = 0;
      if (progress.status === "done" || progress.status === "failed") return progress;
    } catch (error) {
      options.signal.throwIfAborted();
      if (error instanceof AnalysisPollError) throw error;
      if (++failures >= 5) throw new AnalysisPollError("connection", "We lost the connection. Your link is still saved. Check again in a moment.");
    }
    await pause(Math.min(15_000, 3_000 * (failures + 1)), options.signal);
  }
  throw new AnalysisPollError("waiting", "This is taking longer than usual. Your link is still saved. You can check again.");
}
