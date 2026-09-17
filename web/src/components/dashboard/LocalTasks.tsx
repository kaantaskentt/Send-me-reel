"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, ChevronRight, Clock3, FileText, FolderOpen, Loader2, Monitor, MousePointer2, RefreshCw, Square, Terminal, Zap } from "lucide-react";
import { publicLink } from "@/lib/content-conversation";
import { runIsActive, runStatusLabel, taskElapsed, taskResultPreview, taskStatusLabel, type PersonalRun, type RunOutput } from "@/lib/local-runs";
import BrowserSession from "./BrowserSession";
import ContentAnswer from "./ContentAnswer";
import StudioDialog from "./StudioDialog";
import styles from "./studio.module.css";
import view from "./task-view.module.css";

const companion = "http://127.0.0.1:43187";
const isWatchSession = (executor?: string) => executor === "browser" || executor === "computer";

export default function LocalTasks({ token }: { token?: string }) {
  const [runs, setRuns] = useState<PersonalRun[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PersonalRun | null>(null);
  const [output, setOutput] = useState<RunOutput | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [listLoaded, setListLoaded] = useState(false);
  const [retryList, setRetryList] = useState(0);
  const [retryTask, setRetryTask] = useState(0);
  const [now, setNow] = useState(() => Date.now());
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
        if (!controller.signal.aborted) { setRuns(Array.isArray(data.runs) ? data.runs : []); setConnected(true); setListLoaded(true); }
      } catch { if (!controller.signal.aborted) { setConnected(false); setListLoaded(true); } }
      if (!controller.signal.aborted) timer = setTimeout(poll, 4000);
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [request, token, retryList]);

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
  }, [open, selectedId, request, token, retryTask]);

  const selectedActive = selected ? runIsActive(selected.status) : false;
  useEffect(() => {
    if (!open || !selectedActive) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [open, selectedActive]);

  useEffect(() => {
    if (open && isWatchSession(selected?.executor) && browserDialog.current && !browserDialog.current.open) browserDialog.current.showModal();
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
  const waitingForOutput = selected?.executor === "terminal" && !!token && !output && !error;
  const taskNote = !output ? "Task details aren’t available. Try refreshing."
    : selectedActive && selected?.terminalMode === "interactive" ? "Continue in the Terminal window on your Mac."
    : selectedActive ? output.progress?.update || "Your result will appear here."
    : "No report was saved. Open the files to check the result.";
  const close = () => { setOpen(false); setSelected(null); setOutput(null); };
  return <>
    <button type="button" className={styles.toolbarButton} onClick={() => { setOpen(true); setSelected(null); setError(""); }}><Monitor size={16} />Tasks{active > 0 && <span className={styles.taskCount}>{active}</span>}</button>
    {open && !selected && <StudioDialog title="Your tasks" tone="dark" onClose={close}>
      <section className={view.surface} aria-label="Saved tasks">
        {token && !listLoaded ? <p role="status" className={view.loading}><Loader2 size={17} className={view.spinner} />Loading your tasks…</p>
          : !connected && <div className={view.notice} role="status"><p>{token ? "Can’t reach your Mac. Your task may still be running." : "Open ContextDrop on your Mac to see your tasks."}</p>{token && <button type="button" className={view.textButton} onClick={() => { setListLoaded(false); setRetryList(value => value + 1); }}><RefreshCw size={14} />Try again</button>}</div>}
        {!!runs.length && <div className={view.list}>{runs.map(run => <button type="button" key={run.id} className={view.listItem} onClick={() => { setSelected(run); setOutput(null); setError(""); setNow(Date.now()); }}>
          <span className={view.taskIcon}>{run.executor === "terminal" ? <Terminal size={18} /> : run.executor === "browser" ? <Monitor size={18} /> : <MousePointer2 size={18} />}</span>
          <span className={view.listCopy}><strong>{run.title || run.goal || "Local task"}</strong><span><i className={view.statusDot} data-active={runIsActive(run.status)} />{run.executor === "computer" ? "Computer · " : ""}{runStatusLabel(run.status)}</span></span>
          <ChevronRight size={17} className={view.chevron} />
        </button>)}</div>}
        {connected && !runs.length && <div className={view.empty}><span className={view.emptyIcon}><Terminal size={24} /></span><h3>No tasks yet</h3><p>Pick something to do with a saved link.</p></div>}
      </section>
    </StudioDialog>}
    {open && selected?.executor === "terminal" && <StudioDialog title="Your task" tone="dark" onClose={close}>
      <section className={`${view.surface} ${view.panel}`} aria-label="Terminal task output">
        <div className={view.meta}>
          <span className={view.harness}>{selected.harness !== "claude" && selected.terminalMode === "exec" ? <><Zap size={13} />Auto · Codex</> : <><Terminal size={13} />{selected.harness === "claude" ? "Claude Code" : "Codex"} · Terminal</>}</span>
          <span className={view.time}><Clock3 size={13} aria-hidden="true" /><span aria-label="Elapsed time">{taskElapsed(selected, now)}</span></span>
        </div>
        <div className={view.heading}>
          <h3 className={view.title}>{selected.title || selected.goal || "Local task"}</h3>
          <p role="status" className={view.state} data-active={selectedActive}>{selectedActive ? <Loader2 size={15} className={view.spinner} /> : <span className={view.statusDot} />}{taskStatusLabel(selected, output)}</p>
        </div>
        {resultSummary ? <div className={view.result} role="region" aria-label="Task result"><p className={view.eyebrow}><FileText size={14} />Agent’s result</p><ContentAnswer text={resultSummary} allowedUrls={[]} /><p className={view.footnote}>Open the files to check the result.</p></div>
          : <div className={view.progress} aria-busy={waitingForOutput}>{waitingForOutput ? <p className={view.loading}><Loader2 size={15} className={view.spinner} />Loading task details…</p> : <p>{taskNote}</p>}</div>}
        {(error || selected.error) && <div className={view.error}><p role="alert">{error || selected.error}</p>{error && <button type="button" className={view.textButton} onClick={() => { setError(""); setRetryTask(value => value + 1); }}><RefreshCw size={14} />Refresh status</button>}</div>}
        <div className={view.controls}>
          <button type="button" className={resultSummary ? view.primaryButton : view.secondaryButton} disabled={busy} onClick={() => void reveal()}><FolderOpen size={16} />Open files</button>
          {selected.canStop && <button type="button" className={view.secondaryButton} disabled={busy || selected.status === "stopping"} onClick={() => void control("stop")}><Square size={12} />Stop task</button>}
        </div>
        <div className={view.detailsGroup}>
          {output?.result.text && <details className={view.details}><summary>Report & checks<ChevronRight size={15} /></summary><pre className={view.log} tabIndex={0} aria-label="Full task report">{output.result.text}</pre>{output.result.truncated && <p className={view.footnote}>Open the files for the full report.</p>}</details>}
          <details className={view.details}><summary>Activity & details<ChevronRight size={15} /></summary><p className={view.goal}>{selected.goal}</p>{publicLink(selected.sourceUrl) && <a className={view.source} href={selected.sourceUrl} target="_blank" rel="noreferrer">Original source <ArrowUpRight size={13} /></a>}<pre className={view.log} tabIndex={0} aria-label="Task activity">{output?.log.text || "No activity yet."}</pre>{output?.log.truncated && <p className={view.footnote}>Recent activity. Full logs stay on your Mac.</p>}</details>
        </div>
        <footer className={view.footer}><button type="button" className={view.textButton} onClick={() => { setSelected(null); setOutput(null); setError(""); }}><ArrowLeft size={14} />All tasks</button>{selectedActive && <p>Keep your Mac awake. You can close this.</p>}</footer>
      </section>
    </StudioDialog>}
    {open && selected && isWatchSession(selected.executor) && <BrowserSession run={selected} dialogRef={browserDialog} actionBusy={busy} error={error} sourceTitle={selected.sourceUrl} planTitle={selected.title} onControl={control} onClose={close} />}
  </>;
}
