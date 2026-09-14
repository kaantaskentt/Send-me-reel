"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, FolderOpen, Loader2, Monitor, Square, Terminal } from "lucide-react";
import { publicLink } from "@/lib/content-conversation";
import { runIsActive, runStatusLabel, type PersonalRun, type RunOutput } from "@/lib/local-runs";
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
  const [tab, setTab] = useState<"activity" | "result">("activity");
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
      setSelected(run); setOutput(null); setTab("activity"); setOpen(true); setError("");
    };
    window.addEventListener("contextdrop:run", receive);
    return () => window.removeEventListener("contextdrop:run", receive);
  }, []);

  useEffect(() => {
    if (!open || !selectedId || !token) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]);
        const run: PersonalRun = await request(`/runs/${selectedId}`, "GET", undefined, signal);
        if (!controller.signal.aborted) { setSelected(run); setError(""); }
        if (run.executor === "terminal") {
          const snapshot: RunOutput = await request(`/runs/${selectedId}/output`, "GET", undefined, signal);
          if (!controller.signal.aborted) setOutput(snapshot);
        }
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Connection lost. Your task may still be running."); }
      if (!controller.signal.aborted) timer = setTimeout(poll, 2000);
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
  const resultSummary = output?.result.text.split(/\n\s*\n/).map(block => block.replace(/^(?:#{1,6} [^\n]*(?:\n|$))+/, "").trim()).find(Boolean) ?? "";
  const close = () => { setOpen(false); setSelected(null); setOutput(null); };
  return <>
    <button type="button" className={styles.toolbarButton} onClick={() => { setOpen(true); setSelected(null); setError(""); }}><Monitor size={16} />Tasks{active > 0 && <span className={styles.taskCount}>{active}</span>}</button>
    {open && !selected && <StudioDialog title="Your tasks" onClose={close}>
      <p className={styles.dialogDescription}>{connected ? "Tasks run on your Mac. You can leave the conversation and return here to check their progress." : "Start the personal launcher to connect your Mac. Existing work may still be running if the connection was lost."}</p>
      <div className={styles.list}>{runs.map(run => <button type="button" key={run.id} className={styles.listItem} onClick={() => { setSelected(run); setOutput(null); setTab(run.status === "finished_unverified" ? "result" : "activity"); }}>{run.executor === "browser" ? <Monitor size={18} /> : <Terminal size={18} />}<div><strong>{run.title || run.goal || "Local task"}</strong><small>{runStatusLabel(run.status)} · {new Date(run.createdAt).toLocaleString()}</small></div><ArrowUpRight size={15} /></button>)}</div>
      {connected && !runs.length && <p className={styles.empty}>No tasks yet. Ask your content what you want to do, then review its proposed action.</p>}
    </StudioDialog>}
    {open && selected?.executor === "terminal" && <StudioDialog title={selected.title || "Your workspace"} wide tone="dark" onClose={close}>
      <div className={styles.runTop}><p role="status" className={styles.runStatus}>{runIsActive(selected.status) && <Loader2 size={14} className={styles.spinner} />}{runStatusLabel(selected.status)}</p><div className={styles.inline}><button type="button" className={styles.runButton} disabled={busy} onClick={() => void reveal()}><FolderOpen size={14} />Open workspace</button>{selected.canStop && <button type="button" className={styles.runButton} disabled={busy || selected.status === "stopping"} onClick={() => void control("stop")}><Square size={12} />Stop task</button>}</div></div>
      <div className={styles.workroom}><aside className={styles.runContext}><p className={styles.runLabel}>Your request</p><p>{selected.goal}</p>{publicLink(selected.sourceUrl) && <a className={styles.runSource} href={selected.sourceUrl} target="_blank" rel="noreferrer">Original source <ArrowUpRight size={13} /></a>}<p className={styles.runNote}>This task keeps its original source, even when you switch conversations.</p><p className={styles.runNote}>{runIsActive(selected.status) ? "You can close this view while it works. Keep your Mac awake." : "Your files are saved in this project folder."}</p></aside><section className={styles.runMain} aria-label="Terminal task output"><div className={styles.runTabs}><button type="button" aria-pressed={tab === "activity"} onClick={() => setTab("activity")}><Terminal size={14} />Activity</button><button type="button" aria-pressed={tab === "result"} onClick={() => setTab("result")}>Result</button></div>{tab === "activity" ? <><pre className={styles.runLog}>{output?.log.text || (output?.mode === "interactive" ? "This coding app is interactive. Continue in its Terminal window; the task status stays visible here." : "Waiting for the first output from your coding agent…")}</pre>{output?.log.truncated && <p className={styles.runNote}>Showing recent output. Full logs stay in the local task’s control folder.</p>}</> : <><p className={styles.runNote}>Agent report · review required. Open the result and check it.</p>{resultSummary ? <div className={styles.runSummary} role="region" aria-label="Task result"><ContentAnswer text={resultSummary} allowedUrls={[]} /></div> : <p className={styles.runNote}>No result yet. It will appear here when it’s ready.</p>}{output?.result.text && <details className={styles.fullRunReport}><summary>Full report & checks</summary><pre className={styles.runReport}>{output.result.text}</pre></details>}{output?.result.truncated && <p className={styles.runNote}>Report shortened here. Open the workspace for the complete file.</p>}</>}</section></div>
      {(error || selected.error) && <p role="alert" className={styles.runError}>{error || selected.error}</p>}
    </StudioDialog>}
    {open && selected?.executor === "browser" && <BrowserSession run={selected} dialogRef={browserDialog} actionBusy={busy} error={error} sourceTitle={selected.sourceUrl} planTitle={selected.title} onControl={control} onClose={close} />}
  </>;
}
