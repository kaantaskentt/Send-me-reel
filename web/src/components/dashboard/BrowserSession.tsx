"use client";

import { useId, useRef, type RefObject } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, Expand, Loader2, Monitor, RotateCcw, Square, X } from "lucide-react";
import view from "./computer-session.module.css";

export interface LocalRunState {
  id: string; status: string; workspace?: string; error?: string; message?: string;
  executor?: "terminal" | "browser" | "computer";
  currentUrl?: string; currentApp?: string; screenshot?: string;
  pendingAction?: { id: string; type: string; description: string; targetId?: string; url?: string | null; text?: string };
  history?: { action: string; status: string }[];
  canStop?: boolean;
  canResume?: boolean;
}
interface Props {
  run: LocalRunState;
  dialogRef: RefObject<HTMLDialogElement | null>;
  actionBusy: boolean; error: string; sourceTitle: string; planTitle: string;
  onControl: (action: "approve" | "resume" | "stop", approved?: boolean) => Promise<void>;
  rehearsal?: { step: number; totalSteps: number; onRestart: () => void };
  onClose?: () => void;
}
function statusText(status: string): string {
  return ({ launching: "Starting", running: "Working", awaiting_approval: "Ready for your approval", needs_input: "Your help is needed", finished_unverified: "Finished · check the result", failed: "Needs attention", stopped: "Stopped", stopping: "Stopping", interrupted: "Interrupted" } as Record<string, string>)[status] || "Check this task";
}
export default function BrowserSession({ run, dialogRef, actionBusy, error, sourceTitle, planTitle, onControl, rehearsal, onClose }: Props) {
  const expandedScreenshot = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const isComputer = run.executor === "computer";
  const surface = isComputer ? "Mac" : "browser";
  const active = ["launching", "running", "awaiting_approval", "needs_input", "stopping"].includes(run.status);
  const pending = run.status === "awaiting_approval" && run.pendingAction;
  const screenshot = run.screenshot && (/^data:image\/(png|jpeg|webp);base64,/.test(run.screenshot) || (rehearsal && run.screenshot.startsWith("/rehearsal/"))) ? run.screenshot : null;
  const visibleStatus = rehearsal && run.status === "finished_unverified" ? "Rehearsal complete" : rehearsal && run.status === "running" ? "Playing the example" : statusText(run.status);
  async function toggleFullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch { /* The regular dialog remains usable. */ }
  }
  return <dialog ref={dialogRef} onClose={onClose} aria-labelledby={titleId} className={view.dialog}>
    <header className={view.header}>
      <div className={view.title}><Monitor size={21} /><div><h2 id={titleId}>{isComputer ? "Your Mac" : "Browser walkthrough"}</h2><p>{planTitle}</p></div></div>
      <div className={view.controls}>
        {rehearsal && <button type="button" onClick={rehearsal.onRestart}><RotateCcw size={15} />Restart</button>}
        <button type="button" onClick={toggleFullscreen} aria-label="Toggle fullscreen presentation"><Expand size={16} /></button>
        {run.status !== "stopped" && run.canStop !== false && <button type="button" className={view.stop} disabled={actionBusy || run.status === "stopping"} onClick={() => void onControl("stop")}><Square size={12} />{run.status === "stopping" ? "Stopping…" : active ? "Stop task" : "Close session"}</button>}
        <button type="button" onClick={() => dialogRef.current?.close()}><ArrowLeft size={15} /><span>{onClose ? "Back to chat" : "Back to plan"}</span></button>
      </div>
    </header>
    {rehearsal && <p className={view.rehearsal}>Rehearsal · No live actions<span>Step {rehearsal.step} / {rehearsal.totalSteps}</span></p>}
    <div className={view.layout}>
      <section className={view.screen} aria-label={rehearsal ? "Rehearsal browser view" : isComputer ? "Live Mac view" : "Live browser view"}>
        <div className={view.screenBar}><span>{run.currentApp || run.currentUrl || `Your ${surface}`}</span><small>{rehearsal ? "Recorded example" : active ? "Latest capture" : "Last capture"}</small></div>
        {screenshot ? <button type="button" className={view.screenshot} onClick={() => expandedScreenshot.current?.showModal()} aria-label={`Expand current ${surface} screenshot`}><Image unoptimized src={screenshot} width={1280} height={800} alt={`Current ${surface} view for this task`} /><span><Expand size={13} />Expand</span></button> : <div className={view.waiting}>{active ? <Loader2 size={24} className={view.spin} /> : <Monitor size={24} />}<p>{active ? `Waiting for the first ${surface} capture…` : "No screen capture was saved."}</p></div>}
      </section>
      <section className={view.next} aria-label={isComputer ? "Next Mac action" : "Next browser action"}>
        <p className={view.state} data-pending={!!pending} role="status">{active && !pending && run.status !== "needs_input" && <Loader2 size={14} className={view.spin} />}{visibleStatus}</p>
        {pending ? <>
          <h3>{pending.description}</h3>
          {pending.url && <p className={view.destination}><ArrowUpRight size={14} />{pending.url}</p>}
          {pending.text && <div className={view.typedText}><span>Text to enter</span><pre>{pending.text}</pre></div>}
          <div className={view.decisions}><button type="button" className={view.approve} disabled={actionBusy} onClick={() => void onControl("approve", true)}>{actionBusy ? <Loader2 size={16} className={view.spin} /> : <Check size={16} />}Yes, do this</button><button type="button" disabled={actionBusy} onClick={() => void onControl("approve", false)}><X size={15} />Decline</button></div>
          <p className={view.hint}>{rehearsal ? "Changes the example only." : "This approves the action shown above."}</p>
        </> : <p className={view.message}>{run.error || run.message || (active ? `Looking at your ${surface}…` : "Check the result on screen.")}</p>}
        {run.status === "needs_input" && <div className={view.manual}><p>{rehearsal ? "In a live task, you would handle this private step yourself." : `Complete this step on your ${surface}, then continue here. Keep passwords and codes out of chat.`}</p>{run.canResume !== false && <button type="button" className={view.approve} disabled={actionBusy} onClick={() => void onControl("resume")}>{rehearsal ? "Continue rehearsal" : "I’m done, continue"}</button>}</div>}
        {error && <p role="alert" className={view.error}>{error}</p>}
        {run.status === "failed" && run.canResume && <button type="button" disabled={actionBusy} onClick={() => void onControl("resume")}>Look again</button>}
        <p className={view.privacy}>{rehearsal ? "A recorded example. Nothing runs on your computer." : `Screen images and app text go to your AI provider. ${active ? "Closing this view keeps the task open. Use Stop to end it." : "An ended session is not proof the task succeeded."}`}</p>
      </section>
    </div>
    <details className={view.details}><summary>Activity & source{run.history?.length ? ` · ${run.history.length} actions` : ""}</summary><p>{sourceTitle}</p>{run.history && <ol>{run.history.slice(-20).map((item, index) => <li key={index}><ChevronRight size={13} /><span>{item.action}<small>{item.status}</small></span></li>)}</ol>}{run.workspace && <p className={view.workspace}>{run.workspace}</p>}</details>
    {screenshot && <dialog ref={expandedScreenshot} aria-label={`Expanded ${surface} screenshot`} className={view.expanded}><header><p>Current {surface} view</p><button type="button" onClick={() => expandedScreenshot.current?.close()}>Close screenshot<X size={16} /></button></header><Image unoptimized src={screenshot} width={1280} height={800} alt={`Expanded ${surface} screenshot`} /></dialog>}
  </dialog>;
}
