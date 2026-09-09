"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronRight, FileCheck2, Film, MonitorPlay, Play, RotateCcw } from "lucide-react";
import BrowserSession, { type LocalRunState } from "./BrowserSession";

const captures = {
  light: "/rehearsal/light-desktop.png",
  dark: "/rehearsal/dark-desktop.png",
  mobile: "/rehearsal/dark-mobile.png",
};
type Phase = "theme" | "mobile" | "manual" | "finished" | "stopped";

/** Frontend-only stage rehearsal. No model, companion, account or execution requests. */
export default function ReplicationRehearsal() {
  const [ready, setReady] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [phase, setPhase] = useState<Phase>("theme");
  const [run, setRun] = useState<LocalRunState | null>(null);
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const transition = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequence = useRef(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all(Object.values(captures).map((url) => new Promise<void>((resolve, reject) => {
      const img = new window.Image(); img.onload = () => resolve(); img.onerror = () => reject(new Error("Rehearsal capture unavailable")); img.src = url;
    }))).then(() => { if (!cancelled) setReady(true); }).catch(() => { if (!cancelled) setImageError(true); });
    return () => { cancelled = true; if (transition.current) clearTimeout(transition.current); };
  }, []);

  useEffect(() => {
    if (run?.id && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [run?.id]);

  function start() {
    if (!ready) return;
    sequence.current++;
    if (transition.current) clearTimeout(transition.current);
    setPhase("theme"); setBusy(false);
    setRun({
      id: `rehearsal-${sequence.current}`, status: "awaiting_approval",
      currentUrl: `${window.location.origin}/replicate/demo/source`, screenshot: captures.light,
      message: "Recorded local fixture. Review the highlighted theme control.",
      pendingAction: { id: "rehearsal-theme", type: "click", targetId: "1", description: "Switch this site to dark mode, as demonstrated in the example." }, history: [],
    });
  }

  async function control(action: "approve" | "resume" | "stop", approved?: boolean) {
    if (!run || busy) return;
    if (action === "stop" || (action === "approve" && approved === false)) {
      sequence.current++;
      if (transition.current) clearTimeout(transition.current);
      setBusy(false); setPhase("stopped");
      setRun({ ...run, status: "stopped", pendingAction: undefined, message: action === "stop" ? "Rehearsal stopped. No live AI, browser execution, or account action took place." : "Action rejected. The example stayed unchanged. Restart when you want to rehearse again.", history: [...(run.history ?? []), { action: action === "stop" ? "Rehearsal stopped" : "Proposed action declined", status: "No action taken" }] });
      return;
    }
    if (action === "resume" && phase === "manual") {
      setPhase("finished");
      setRun({ ...run, status: "finished_unverified", pendingAction: undefined, message: "The test example showed a working theme switch and a stacked mobile layout. The handoff was simulated. No live task, account action, or AI analysis was performed by this rehearsal.", history: [...(run.history ?? []), { action: "Manual checkpoint", status: "Simulated for rehearsal" }] });
      return;
    }
    if (action !== "approve" || !approved || (phase !== "theme" && phase !== "mobile")) return;
    const generation = sequence.current;
    const oldPhase = phase;
    setBusy(true);
    setRun({ ...run, status: "running", pendingAction: undefined, message: "Replaying the recorded result of this example action…" });
    transition.current = setTimeout(() => {
      if (generation !== sequence.current) return;
      setBusy(false);
      if (oldPhase === "theme") {
        setPhase("mobile");
        setRun({ ...run, status: "awaiting_approval", screenshot: captures.dark, message: "The recorded page changed to dark mode. The next highlighted target is the mobile preview.", pendingAction: { id: "rehearsal-mobile", type: "click", targetId: "2", description: "Open the mobile preview to inspect how the layout adapts." }, history: [...(run.history ?? []), { action: "Theme switch: light → dark", status: "Replayed test capture" }] });
      } else {
        setPhase("manual");
        setRun({ ...run, status: "needs_input", screenshot: captures.mobile, pendingAction: undefined, message: "The recorded layout now shows the mobile view. This next checkpoint illustrates the moment a real run would wait for your private input or decision.", history: [...(run.history ?? []), { action: "Responsive preview: desktop → mobile", status: "Replayed test capture" }] });
      }
    }, 650);
  }

  return <section className="mb-7 overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-white to-blue-50" aria-labelledby="rehearsal-title">
    <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6"><div className="max-w-xl"><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600">Rehearsal · recorded test example</p><h2 id="rehearsal-title" className="text-xl">Watch it. Approve it. See what changes.</h2><p className="mt-2 text-sm leading-relaxed text-slate-500">A repeatable walkthrough of the real approval interface. Your clicks replay a local example, with no AI calls or account actions.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={start} disabled={!ready} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-200/50 hover:bg-blue-700 disabled:opacity-50">{run ? <RotateCcw size={16} /> : <Play size={16} fill="currentColor" />}{run ? "Restart rehearsal" : ready ? "Start rehearsal" : "Loading example…"}</button>{run && <button type="button" onClick={() => dialog.current?.showModal()} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 text-xs font-semibold text-blue-700"><MonitorPlay size={15} />Open rehearsal</button>}</div></div>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-blue-100 bg-white/60 px-5 py-3 text-xs font-medium text-slate-500 sm:px-6"><span className="flex items-center gap-2"><Film size={14} className="text-blue-500" />Source evidence</span><ChevronRight size={12} className="text-blue-300" /><span className="flex items-center gap-2"><FileCheck2 size={14} className="text-blue-500" />Prepared plan</span><ChevronRight size={12} className="text-blue-300" /><span className="flex items-center gap-2"><MonitorPlay size={14} className="text-blue-500" />You approve the next action</span><span className="ml-auto hidden items-center gap-1 text-[10px] text-blue-600 sm:flex">Explore the plan below<ArrowRight size={12} className="rotate-90" /></span></div>
    {imageError && <p role="alert" className="px-5 pb-4 text-sm text-red-700">The recorded example images are unavailable. Refresh this page or explore the source plan below.</p>}
    {run && <BrowserSession run={run} dialogRef={dialog} actionBusy={busy} error="" sourceTitle="Northstar Studio · recorded local test fixture" planTitle="Recreate a responsive site with a working theme switch" onControl={control} rehearsal={{ step: phase === "theme" ? 1 : phase === "mobile" ? 2 : 3, totalSteps: 3, onRestart: start }} />}
  </section>;
}
