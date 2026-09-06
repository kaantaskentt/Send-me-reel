"use client";

import { useRef, type RefObject } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, Circle, Expand, Loader2, Monitor, Square, X } from "lucide-react";

export interface LocalRunState {
  id: string; status: string; workspace?: string; error?: string; message?: string;
  currentUrl?: string; screenshot?: string;
  pendingAction?: { id: string; type: string; description: string; targetId?: string; url?: string; text?: string };
  history?: { action: string; status: string }[];
}

interface Props {
  run: LocalRunState;
  dialogRef: RefObject<HTMLDialogElement | null>;
  actionBusy: boolean;
  error: string;
  sourceTitle: string;
  planTitle: string;
  onControl: (action: "approve" | "resume" | "stop", approved?: boolean) => Promise<void>;
}

function statusText(status: string): string {
  return ({ launching: "Opening your browser", running: "Working through the plan", awaiting_approval: "Your decision is needed", needs_input: "Continue in the browser", finished_unverified: "Session ended · outcome unverified", failed: "Browser session failed", stopped: "Session stopped" })[status] || "Check the browser session";
}

export default function BrowserSession({ run, dialogRef, actionBusy, error, sourceTitle, planTitle, onControl }: Props) {
  const expandedScreenshot = useRef<HTMLDialogElement>(null);
  const active = ["launching", "running", "awaiting_approval", "needs_input"].includes(run.status);
  const pending = run.status === "awaiting_approval" && run.pendingAction;
  const screenshot = run.screenshot?.startsWith("data:image/") ? run.screenshot : null;

  return <dialog ref={dialogRef} aria-labelledby="browser-session-title" className="m-auto max-h-[94dvh] w-[1160px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-0 text-white shadow-2xl backdrop:bg-slate-950/75 backdrop:backdrop-blur-sm">
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950 px-5 py-4 sm:px-6">
      <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-900 bg-blue-950 text-blue-300"><Monitor size={20} /></span><div><h2 id="browser-session-title" className="text-lg">Browser walkthrough</h2><p className="mt-1 text-[11px] text-slate-400">{active ? "Watch the page. Review the next action." : "Review the final page and the work that happened."}</p></div></div>
      <button type="button" onClick={() => dialogRef.current?.close()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"><ArrowLeft size={13} />Back to plan</button>
    </header>

    <div className="grid min-w-0 gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section className="min-w-0" aria-label="Live browser view">
        <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
          <div className="flex min-w-0 items-center gap-3 border-b border-slate-700 px-3 py-2.5"><span className="flex shrink-0 gap-1.5" aria-hidden="true"><i className="h-2 w-2 rounded-full bg-slate-600" /><i className="h-2 w-2 rounded-full bg-slate-600" /><i className="h-2 w-2 rounded-full bg-slate-600" /></span><p className="min-w-0 flex-1 truncate font-mono text-[10px] text-slate-400">{run.currentUrl || "Waiting for the browser…"}</p><span className="flex shrink-0 items-center gap-1.5 text-[9px] font-semibold text-slate-400"><span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-slate-500"}`} />{active ? "Latest capture" : "Last capture"}</span></div>
          {screenshot ? <button type="button" onClick={() => expandedScreenshot.current?.showModal()} aria-label="Expand current browser screenshot" className="group relative block w-full bg-slate-900"><Image unoptimized src={screenshot} width={1280} height={800} alt="Current local browser view with proposed action targets" className="max-h-[30vh] w-full object-contain sm:max-h-[54vh] object-top" /><span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg bg-slate-950/85 px-2 py-1 text-[10px] text-white opacity-80 group-hover:opacity-100"><Expand size={12} />Expand</span></button> : <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 p-6 text-center sm:min-h-[340px]">{active ? <Loader2 size={25} className="animate-spin text-blue-400" /> : <Monitor size={25} className="text-slate-500" />}<p className="text-sm text-slate-400">{active ? "Waiting for the first browser capture…" : "No browser capture is available for this session."}</p></div>}
        </div>
        <div className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-slate-400"><Circle size={12} className="mt-0.5 shrink-0 text-amber-400" /><p>Numbered highlights identify proposed targets. The page may change; approve only when the visible action matches your intent.</p></div>
      </section>

      <section aria-label="Next browser action" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div aria-live="polite" className={`rounded-xl border p-4 ${pending ? "border-amber-700/80 bg-amber-950/35" : "border-slate-700 bg-slate-900"}`}>
          <div className="mb-3 flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${pending ? "bg-amber-400" : run.status === "failed" ? "bg-red-400" : "bg-blue-400"}`} /><p className={`text-xs font-bold ${pending ? "text-amber-200" : "text-blue-200"}`}>{statusText(run.status)}</p></div>
          {pending ? <><p className="text-[9px] font-bold uppercase tracking-wider text-amber-500">Proposed · {pending.type}{pending.targetId ? ` · target ${pending.targetId}` : ""}</p><p className="mt-3 text-base font-semibold leading-snug text-white">{pending.description}</p>{pending.url && <p className="mt-3 flex items-start gap-1.5 break-all text-xs leading-relaxed text-amber-200"><ArrowUpRight size={13} className="mt-0.5 shrink-0" />{pending.url}</p>}{pending.text && <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950 p-3"><p className="mb-1 text-[9px] uppercase tracking-wider text-slate-500">Text to enter</p><p className="max-h-32 overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-slate-300">{pending.text}</p></div>}<div className="mt-5 grid grid-cols-2 gap-2"><button disabled={actionBusy} onClick={() => onControl("approve", true)} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-500 px-2 py-3 text-xs font-bold text-white hover:bg-blue-400 disabled:opacity-50">{actionBusy ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />}Approve this action</button><button disabled={actionBusy} onClick={() => onControl("approve", false)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-600 bg-slate-900 px-3 py-3 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"><X size={14} />Reject</button></div><p className="mt-3 text-[10px] leading-relaxed text-amber-300/70">Approval applies to this action only.</p></> : <p className="text-xs leading-relaxed text-slate-400">{run.error || run.message || (active ? "The local planner is inspecting the browser. Its next proposed action will appear here." : "Inspect the final page and acceptance checks. An ended session is not proof that the task succeeded.")}</p>}
          {run.status === "needs_input" && <div className="mt-4"><p className="mb-3 text-xs leading-relaxed text-slate-400">Complete the requested login or manual step in the visible browser. Keep passwords and verification codes out of this page.</p><button disabled={actionBusy} onClick={() => onControl("resume")} className="w-full rounded-lg bg-blue-500 px-3 py-3 text-xs font-bold hover:bg-blue-400 disabled:opacity-50">I’m done, continue</button></div>}
        </div>
        {error && <p role="alert" className="mt-3 rounded-lg border border-red-900 bg-red-950/40 p-3 text-xs leading-relaxed text-red-200">{error}</p>}
        {run.status !== "stopped" && <button disabled={actionBusy} onClick={() => onControl("stop")} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-3 text-xs font-semibold text-slate-300 hover:border-red-800 hover:bg-red-950/30 hover:text-red-200 disabled:opacity-50"><Square size={12} />{active ? "Stop browser session" : "Close browser session"}</button>}
        <p className="mt-4 text-[10px] leading-relaxed text-slate-500">Back to plan keeps the browser session open. Stop ends it. Browser guidance sends captures and visible text to OpenAI using your local API key.</p>
      </section>
      <section className="min-w-0 lg:col-span-2" aria-label="Session details">
        <div className="mt-5 border-t border-slate-800 pt-4"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Prepared task</p><p className="mt-1.5 text-sm font-medium text-slate-200">{planTitle}</p><p className="mt-1 text-[11px] text-slate-500">Source: {sourceTitle}</p></div>
        {run.history && run.history.length > 0 && <details className="mt-4 rounded-lg border border-slate-800 px-3 py-2.5"><summary className="cursor-pointer text-xs font-medium text-slate-400">Action history ({run.history.length})</summary><ol className="mt-3 space-y-2 border-t border-slate-800 pt-3">{run.history.slice(-20).map((item, i) => <li key={i} className="flex items-start gap-2 text-[11px] leading-relaxed"><ChevronRight size={12} className="mt-0.5 shrink-0 text-slate-600" /><span><span className="mr-1 font-medium text-slate-300">{item.status}</span><span className="text-slate-500">{item.action}</span></span></li>)}</ol></details>}
        {run.workspace && <details className="mt-3 text-[10px] text-slate-500"><summary className="cursor-pointer">Local workspace</summary><p className="mt-2 break-all font-mono">{run.workspace}</p></details>}
      </section>
    </div>
    {screenshot && <dialog ref={expandedScreenshot} aria-label="Expanded browser screenshot" className="m-auto max-h-[94dvh] w-[95vw] max-w-6xl overflow-auto rounded-xl border border-slate-300 bg-white p-3 text-slate-900 backdrop:bg-slate-950/85"><div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm font-semibold">Current browser view</p><button onClick={() => expandedScreenshot.current?.close()} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">Close screenshot</button></div><Image unoptimized src={screenshot} width={1280} height={800} alt="Expanded local browser screenshot" className="h-auto w-full" /></dialog>}
  </dialog>;
}
