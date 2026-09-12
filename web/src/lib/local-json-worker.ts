import { spawn } from "node:child_process";

/** A fixed local worker's bounded JSON transport. Never takes a shell command. */
export async function runLocalJsonWorker(command: string, args: string[], input: unknown, options: {
  cwd: string;
  env: NodeJS.ProcessEnv;
  signal?: AbortSignal;
  timeoutMs?: number;
  terminationGraceMs?: number;
  maxOutputBytes?: number;
}): Promise<unknown> {
  const payload = JSON.stringify(input);
  if (Buffer.byteLength(payload) > 16_384) throw new Error("The local inspection request is too large.");
  options.signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd, env: options.env, stdio: ["pipe", "pipe", "pipe"], detached: process.platform !== "win32" });
    const chunks: Buffer[] = [];
    let bytes = 0;
    let failure: Error | undefined;
    let forceKill: ReturnType<typeof setTimeout> | undefined;
    const kill = (signal: NodeJS.Signals) => {
      try {
        if (process.platform !== "win32" && child.pid) process.kill(-child.pid, signal);
        else child.kill(signal);
      } catch { /* The worker may already have exited. */ }
    };
    const stop = (error: Error) => {
      if (failure) return;
      failure = error;
      kill("SIGTERM");
      forceKill = setTimeout(() => kill("SIGKILL"), options.terminationGraceMs ?? 3000);
      forceKill.unref();
    };
    const abort = () => stop(new Error("The local inspection was cancelled."));
    const timer = setTimeout(() => stop(new Error("The local inspection timed out.")), options.timeoutMs ?? 165_000);
    const cleanup = () => {
      // The direct worker may exit while a same-group media subprocess remains.
      // Retire the entire owned group before cancelling the escalation timer,
      // including successful workers that accidentally left descendants behind.
      kill("SIGKILL");
      clearTimeout(timer);
      if (forceKill) clearTimeout(forceKill);
      options.signal?.removeEventListener("abort", abort);
    };
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) abort();
    child.stdout.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > (options.maxOutputBytes ?? 512 * 1024)) stop(new Error("The local inspection response is too large."));
      else if (!failure) chunks.push(chunk);
    });
    // Drain diagnostics without returning process output or credentials to chat.
    child.stderr.resume();
    child.stdin.on("error", () => { /* Exit/close below reports the worker failure. */ });
    child.once("error", () => { cleanup(); reject(new Error("The local media worker could not start.")); });
    child.once("close", code => {
      cleanup();
      if (failure) { reject(failure); return; }
      if (code !== 0) { reject(new Error("The local media worker could not finish.")); return; }
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch { reject(new Error("The local media worker returned an invalid response.")); }
    });
    child.stdin.end(payload);
  });
}
