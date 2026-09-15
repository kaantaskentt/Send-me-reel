"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, FolderOpen, Loader2, Monitor, Square, Terminal, Zap } from "lucide-react";
import { publicLink } from "@/lib/content-conversation";
import { runIsActive, runStatusLabel, taskElapsed, taskResultPreview, taskStatusLabel, type PersonalRun, type RunOutput } from "@/lib/local-runs";
import BrowserSession from "./BrowserSession";
import ContentAnswer from "./ContentAnswer";
import StudioDialog from "./StudioDialog";
import styles from "./studio.module.css";

const companion = "http://127.0.0.1:43187";

export default function LocalTasks({ token }: { token?: string }) {
  const [runs, setRuns] = useState<PersonalRun[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PersonalRun | null>(null);
  const [output, setOutput] = useState<RunOutput | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const browserDialog = useRef<HTMLDialogElement>(null);
  const selectedId = selected?.id;

  const request = useCallback(async (route: string, method = "GET", body?: object, signal?: AbortSignal) => {
    if (!token) throw new Error("Start ContextDrop with the personal launcher to connect your Mac.");
    const response = await fetch(`${companion}${route}`, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: signal ?? AbortSignal.timeout(8000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "The Mac companion could not complete this request.");
    return data;
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const data = await request("/runs", "GET", undefined, AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]));
        if (!controller.signal.aborted) { setRuns(Array.isArray(data.runs) ? data.runs : []); setConnected(true); }
      } catch { if (!controller.signal.aborted) setConnected(false); }
      if (!controller.signal.aborted) timer = setTimeout(poll, 4000);
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [request, token]);

  useEffect(() => {
    const receive = (event: Event) => {
      const run = (event as CustomEvent<PersonalRun>).detail;
      if (!run || !/^[a-f0-9-]{36}$/.test(run.id)) return;
      setSelected(run); setOutput(null); setOpen(true); setError("");
    };
    window.addEventListener("contextdrop:run", receive);
    return () => window.removeEventListener("contextdrop:run", receive);
  }, []);

  useEffect(() => {
    if (!open || !selectedId || !token) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      let keepPolling = true;
      try {
        const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]);
        const run: PersonalRun = await request(`/runs/${selectedId}`, "GET", undefined, signal);
        if (!controller.signal.aborted) { setSelected(run); setError(""); }
        if (run.executor === "terminal") {
          const snapshot: RunOutput = await request(`/runs/${selectedId}/output`, "GET", undefined, signal);
          if (!controller.signal.aborted) setOutput(snapshot);
        }
        keepPolling = runIsActive(run.status);
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Connection lost. Your task may still be running."); }
      if (!controller.signal.aborted && keepPolling) timer = setTimeout(poll, 2000);
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [open, selectedId, request, token]);

  useEffect(() => {
    if (open && selected?.executor === "browser" && browserDialog.current && !browserDialog.current.open) browserDialog.current.showModal();
  }, [open, selectedId, selected?.executor]);

  async function control(action: "approve" | "resume" | "stop", approved?: boolean) {
    if (!selected || busy) return;
    setBusy(true); setError("");
    try {
      const data = await request(`/runs/${selected.id}/${action}`, "POST", action === "approve" ? { actionId: selected.pendingAction?.id, approved } : {});
      if (data.id) setSelected(data);
    } catch (e) { setError(e instanceof Error ? e.message : "The action could not finish. Inspect the workspace before retrying."); }
    finally { setBusy(false); }
  }

  async function reveal() {
    if (!selected || busy) return;
    setBusy(true); setError("");
    try { await request(`/runs/${selected.id}/reveal`, "POST", { target: "workspace" }); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not open this workspace."); }
    finally { setBusy(false); }
  }

  const active = runs.filter(run => runIsActive(run.status)).length;
  const resultSummary = taskResultPreview(output?.result.text ?? "");
  const close = () => { setOpen(false); setSelected(null); setOutput(null); };
  return <>
    <button type="button" className={styles.toolbarButton} onClick={() => { setOpen(true); setSelected(null); setError(""); }}><Monitor size={16} />Tasks{active > 0 && <span className={styles.taskCount}>{active}</span>}</button>
    {open && !selected && <StudioDialog title="Your tasks" onClose={close}>
      <p className={styles.dialogDescription}>{connected ? "Your Mac keeps working. Pick a task to check it." : "Reconnect your Mac to see your tasks."}</p>
      <div className={styles.list}>{runs.map(run => <button type="button" key={run.id} className={styles.listItem} onClick={() => { setSelected(run); setOutput(null); }}>{run.executor === "browser" ? <Monitor size={18} /> : <Terminal size={18} />}<div><strong>{run.title || run.goal || "Local task"}</strong><small>{runStatusLabel(run.status)} · {new Date(run.createdAt).toLocaleString()}</small></div><ArrowUpRight size={15} /></button>)}</div>
      {connected && !runs.length && <p className={styles.empty}>No tasks yet. Ask your content what you want to do, then review its proposed action.</p>}
    </StudioDialog>}
    {open && selected?.executor === "terminal" && <StudioDialog title="Your task" onClose={close}>
      <section className={styles.taskView} aria-label="Terminal task output">
        <div className={styles.taskMeta}>
          <span className={styles.autoBadge}>{selected.harness !== "claude" && selected.terminalMode === "exec" ? <><Zap size={13} />Auto · Codex</> : <><Terminal size={13} />{selected.harness === "claude" ? "Claude Code" : "Codex"} · Terminal</>}</span>
          <span className={styles.taskTime}>{taskElapsed(selected)}</span>
        </div>
        <h3 className={styles.taskTitle}>{selected.title || selected.goal || "Local task"}</h3>
        <p role="status" className={styles.taskState}>{runIsActive(selected.status) && <Loader2 size={16} className={styles.spinner} />}{taskStatusLabel(selected, output)}</p>
        {resultSummary ? <div className={styles.taskResult} role="region" aria-label="Task result"><p className={styles.taskEyebrow}>Agent’s result</p><ContentAnswer text={resultSummary} allowedUrls={[]} /><p className={styles.taskFootnote}>Open the files to check the result.</p></div> : <div className={styles.taskProgress}><p>{output?.progress?.update || (selected.terminalMode === "interactive" ? "Continue in the Terminal window on your Mac." : "Your result will appear here.")}</p></div>}
        {(error || selected.error) && <p role="alert" className={styles.error}>{error || selected.error}</p>}
        <div className={styles.taskControls}>
          <button type="button" className={resultSummary ? styles.primaryButton : styles.secondaryButton} disabled={busy} onClick={() => void reveal()}><FolderOpen size={16} />Open files</button>
          {selected.canStop && <button type="button" className={styles.secondaryButton} disabled={busy || selected.status === "stopping"} onClick={() => void control("stop")}><Square size={12} />Stop task</button>}
        </div>
        {output?.result.text && <details className={styles.taskDetails}><summary>Report & checks</summary><pre className={styles.taskLog}>{output.result.text}</pre>{output.result.truncated && <p className={styles.taskFootnote}>Open the files for the full report.</p>}</details>}
        <details className={styles.taskDetails}><summary>Activity & details</summary><p className={styles.taskOriginalGoal}>{selected.goal}</p>{publicLink(selected.sourceUrl) && <a className={styles.taskSource} href={selected.sourceUrl} target="_blank" rel="noreferrer">Original source <ArrowUpRight size={13} /></a>}<pre className={styles.taskLog}>{output?.log.text || "No activity yet."}</pre>{output?.log.truncated && <p className={styles.taskFootnote}>Recent activity. Full logs stay on your Mac.</p>}</details>
        {runIsActive(selected.status) && <p className={styles.taskFootnote}>You can close this and come back. Keep your Mac awake.</p>}
      </section>
    </StudioDialog>}
    {open && selected?.executor === "browser" && <BrowserSession run={selected} dialogRef={browserDialog} actionBusy={busy} error={error} sourceTitle={selected.sourceUrl} planTitle={selected.title} onControl={control} onClose={close} />}
  </>;
}
