"use client";

import { useEffect, useRef, useState } from "react";
import BrowserSession, { type LocalRunState as RunState } from "./BrowserSession";
import ReplicationRehearsal from "./ReplicationRehearsal";
import { ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, Circle, Code2, Download, ExternalLink, FileText, Film, Loader2, Monitor, RefreshCw, Sparkles, Terminal, Unplug, WandSparkles, Workflow } from "lucide-react";
import type { Analysis } from "@/lib/types";
import { buildSourceEvidence, parseReplicationPlan, replicationPlanMarkdown, type ReplicationPlan } from "@/lib/execution-plan";
import { parseVerdict } from "@/lib/verdict-parser";

const COMPANION_URL = "http://127.0.0.1:43187";
const MODES = [
  { id: "build", title: "Build it", detail: "A site, app, or tool", icon: Code2, prompt: "Recreate the main result as a working local project. Explain any missing setup and verify it in a browser." },
  { id: "automate", title: "Automate it", detail: "A repeatable workflow", icon: Workflow, prompt: "Adapt the workflow to run for me. Identify the accounts and inputs needed, then prove each step works." },
  { id: "create", title: "Make my version", detail: "Content, assets, or a brief", icon: WandSparkles, prompt: "Create my own version using the techniques in this source. Identify the assets needed and prepare an editable result." },
  { id: "research", title: "Understand it", detail: "Explain, compare, investigate", icon: BookOpen, prompt: "Explain how this works, verify the main claims, and give me a concrete example I can try." },
] as const;

type Harness = "codex" | "claude";
interface Props { analysis: Analysis; initialPlan?: ReplicationPlan; demo?: boolean; planningEndpoint?: string; initialExecutor?: "browser" | "terminal"; planningNotice?: string; initialPairingToken?: string; initialGoal?: string; initialMode?: ReplicationPlan["mode"]; initialHarness?: Harness; contextSourceIds?: string[] }

function timestamp(seconds: number | null) {
  if (seconds === null) return "No timestamp";
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

function sourceAt(url: string, seconds: number | null): string {
  try {
    const parsed = new URL(url);
    if (seconds !== null && /(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(parsed.hostname)) parsed.searchParams.set("t", `${Math.floor(seconds)}s`);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "#";
  } catch { return "#"; }
}

function download(content: string, name: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export default function ReplicationPanel({ analysis, initialPlan, demo = false, planningEndpoint, initialExecutor = "terminal", planningNotice, initialPairingToken = "", initialGoal = "", initialMode = "build", initialHarness = "codex", contextSourceIds = [] }: Props) {
  const captured = buildSourceEvidence(analysis);
  const [mode, setMode] = useState<ReplicationPlan["mode"]>(initialPlan?.mode ?? initialMode);
  const [goal, setGoal] = useState(initialPlan?.goal ?? initialGoal);
  const [plan, setPlan] = useState<ReplicationPlan | null>(initialPlan ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"plan" | "evidence">("plan");
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const [token, setToken] = useState(initialPairingToken);
  const [paired, setPaired] = useState(false);
  const [pairBusy, setPairBusy] = useState(false);
  const [localError, setLocalError] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [origin, setOrigin] = useState("http://localhost:3000");
  const [run, setRun] = useState<(RunState & { harness?: Harness }) | null>(null);
  const [launchBusy, setLaunchBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [executor, setExecutor] = useState<"terminal" | "browser">(initialExecutor);
  const [browserConfigured, setBrowserConfigured] = useState(false);
  const [harness, setHarness] = useState<Harness>(initialHarness);
  const [harnesses, setHarnesses] = useState<Record<Harness, boolean>>({ codex: false, claude: false });
  const [macSupported, setMacSupported] = useState(true);
  const [reviewed, setReviewed] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const browserSessionDialog = useRef<HTMLDialogElement>(null);
  const generationController = useRef<AbortController | null>(null);
  const evidenceRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const sourceTitle = analysis.metadata?.title || (analysis.verdict ? parseVerdict(analysis.verdict).title : null) || analysis.caption?.slice(0, 100) || "Saved source";
  const stale = plan && (plan.goal !== goal.trim() || plan.mode !== mode);
  const runActive = !!run && ["launching", "running", "awaiting_approval", "needs_input"].includes(run.status);
  const sessionOpen = runActive || (!!run && executor === "browser" && run.status !== "stopped");
  const harnessName = harness === "claude" ? "Claude Code" : "Codex";
  const runHarnessName = (run?.harness ?? harness) === "claude" ? "Claude Code" : "Codex";
  const terminalAvailable = macSupported && harnesses[harness];

  useEffect(() => { setOrigin(window.location.origin); return () => generationController.current?.abort(); }, []);
  useEffect(() => {
    if (executor === "browser" && run?.id && browserSessionDialog.current && !browserSessionDialog.current.open) browserSessionDialog.current.showModal();
  }, [executor, run?.id]);
  useEffect(() => {
    if (tab === "evidence" && selectedEvidence) evidenceRefs.current[selectedEvidence]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [tab, selectedEvidence]);
  useEffect(() => {
    if (!runActive || !run?.id || !paired) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch(`${COMPANION_URL}/runs/${encodeURIComponent(run.id)}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        if (!response.ok) throw new Error("Could not read the local run. Check the companion terminal.");
        const state = await response.json();
        if (!cancelled && typeof state.status === "string") setRun(state);
      } catch (e) {
        if (!cancelled) setLocalError(e instanceof Error ? e.message : "Local connection lost. Check Terminal for the actual run state.");
      }
      if (!cancelled) timer = setTimeout(poll, 3_000);
    };
    timer = setTimeout(poll, 1_000);
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [runActive, run?.id, paired, token]);

  async function prepare() {
    if (demo || busy) return;
    setBusy(true); setError(""); setReviewed(false);
    const controller = new AbortController(); generationController.current = controller;
    try {
      const response = await fetch(planningEndpoint ?? `/api/analyses/${analysis.id}/replicate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal: goal.trim(), mode, ...(planningEndpoint === "/api/local/replicate" ? { analysisId: analysis.id, contextSourceIds } : {}) }), signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not prepare this plan.");
      setPlan(parseReplicationPlan(data.plan)); setTab("plan"); setRun(null);
      if (typeof data.usage?.remaining === "number") setRemaining(data.usage.remaining);
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Could not prepare this plan."); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }

  async function pair() {
    setPairBusy(true); setLocalError(""); setPaired(false);
    try {
      const response = await fetch(`${COMPANION_URL}/health`, { headers: { Authorization: `Bearer ${token.trim()}` }, signal: AbortSignal.timeout(5_000) });
      if (!response.ok) throw new Error(response.status === 401 ? "Pairing token was rejected. Copy the current token from the companion." : "The local companion is not ready.");
      const health = await response.json();
      setMacSupported(!health.platform || health.platform === "darwin");
      const terminalConfigured = health.capabilities?.terminal !== false;
      const detected = health.capabilities?.harnesses;
      setHarnesses({
        codex: terminalConfigured && (detected ? detected.codex === true : health.codexAvailable !== false),
        claude: terminalConfigured && detected?.claude === true,
      });
      setBrowserConfigured(health.capabilities?.browser?.configured === true);
      setToken(token.trim()); setPaired(true);
    } catch (e) { setLocalError(e instanceof TypeError ? "Cannot reach the companion. Start it with this app’s exact origin and allow local network access if your browser asks." : e instanceof Error ? e.message : "Connection failed."); }
    finally { setPairBusy(false); }
  }

  async function launch() {
    if (!plan || stale || !reviewed || demo || sessionOpen || launchBusy || !paired || (executor === "terminal" ? !terminalAvailable : !browserConfigured)) return;
    setLaunchBusy(true); setLocalError("");
    try {
      const response = await fetch(`${COMPANION_URL}/runs`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ plan, executor, ...(executor === "terminal" ? { harness } : {}) }), signal: AbortSignal.timeout(15_000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The companion could not open a session.");
      setRun(result); setShowSetup(false);
    } catch (e) { setLocalError(e instanceof Error ? `${e.message} If the request timed out, inspect Terminal before retrying.` : "Launch failed. Check Terminal before retrying."); }
    finally { setLaunchBusy(false); }
  }

  async function controlRun(action: "approve" | "resume" | "stop", approved?: boolean) {
    if (!run || actionBusy || demo) return;
    setActionBusy(true); setLocalError("");
    try {
      const response = await fetch(`${COMPANION_URL}/runs/${encodeURIComponent(run.id)}/${action}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(action === "approve" ? { actionId: run.pendingAction?.id, approved } : {}), signal: AbortSignal.timeout(15_000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The local action could not be updated.");
      if (typeof result.status === "string" && result.id) setRun(result);
    } catch (e) { setLocalError(e instanceof Error ? e.message : "Local action failed. Check the browser before retrying."); }
    finally { setActionBusy(false); }
  }

  return (
    <div className="text-slate-900">
      {demo && <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><Film size={16} /><strong>Interactive demo</strong><span>Illustrative source and prepared plan. No AI request or computer execution.</span></div>}
      {demo && <ReplicationRehearsal />}
      <div className="mb-8 flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"><Film size={23} /></div>
        <div className="min-w-0 flex-1"><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Your source · {analysis.platform}</p><h2 className="text-base leading-snug">{String(sourceTitle)}</h2><p className="mt-1 truncate text-xs text-slate-500">{analysis.source_url}</p></div>
        <a href={sourceAt(analysis.source_url, null)} target="_blank" rel="noopener noreferrer" aria-label="Open original source" className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"><ExternalLink size={17} /></a>
      </div>

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-7">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7" aria-labelledby="intent-title">
            <div className="mb-5 flex items-center gap-2 text-blue-700"><Sparkles size={17} /><h2 id="intent-title" className="text-lg text-slate-900">What do you want to do with it?</h2></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {MODES.map(({ id, title, detail, icon: Icon }) => <button key={id} type="button" aria-pressed={mode === id} onClick={() => { setMode(id); setReviewed(false); }} className={`flex min-w-0 flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors ${mode === id ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}><Icon size={18} /><span className="text-xs font-bold">{title}</span><span className="text-[10px] leading-relaxed text-slate-500">{detail}</span></button>)}
            </div>
            <label htmlFor="replication-goal" className="mb-2 mt-5 block text-xs font-semibold">Your outcome, in your words</label>
            <textarea id="replication-goal" value={goal} maxLength={1_200} onChange={(e) => { setGoal(e.target.value); setReviewed(false); }} placeholder={MODES.find((m) => m.id === mode)?.prompt} rows={3} className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-sm leading-relaxed outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><button type="button" onClick={() => { setGoal(MODES.find((m) => m.id === mode)!.prompt); setReviewed(false); }} className="text-xs font-medium text-blue-700 hover:underline">Use suggested goal</button><span className="text-[10px] text-slate-400">{goal.length}/1,200</span></div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="max-w-xs text-xs leading-relaxed text-slate-500">Uses captured transcript, frame observations, and source text. Every step gets evidence or an inference label.</p><button onClick={prepare} disabled={demo || busy || goal.trim().length < 8 || sessionOpen || analysis.status !== "done"} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : plan ? <RefreshCw size={15} /> : <Sparkles size={15} />}{demo ? "Example plan below" : busy ? "Reading source evidence…" : plan ? "Regenerate plan" : "Prepare my plan"}</button></div>
            {!demo && <p className="mt-3 text-[10px] leading-relaxed text-slate-400">{planningNotice ?? (remaining === null ? "20 planning attempts per 24-hour window. Free chat shares this allowance. Each generation attempt uses a slot." : `${remaining} planning requests remain in the current window.`)}</p>}
            {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {stale && <p role="status" className="mt-4 text-xs text-amber-800">Your goal changed. Regenerate the plan before launching or exporting it.</p>}
          </section>

          {plan ? <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 p-5 sm:p-7"><div className="mb-3 flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700"><FileText size={11} />Prepared plan</span><span className="text-[10px] text-slate-400">Not executed</span></div><h2 className="text-xl leading-snug">{plan.title}</h2><p className="mt-3 text-sm leading-relaxed text-slate-500">{plan.summary}</p></div>
            <div role="tablist" aria-label="Plan views" className="flex gap-6 border-b border-slate-100 px-5 sm:px-7"><button id="plan-tab" role="tab" aria-selected={tab === "plan"} aria-controls="plan-view" onClick={() => setTab("plan")} className={`border-b-2 py-4 text-xs font-semibold ${tab === "plan" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500"}`}>Execution plan <span className="ml-1 text-slate-400">{plan.steps.length}</span></button><button id="evidence-tab" role="tab" aria-selected={tab === "evidence"} aria-controls="evidence-view" onClick={() => setTab("evidence")} className={`border-b-2 py-4 text-xs font-semibold ${tab === "evidence" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500"}`}>Source evidence <span className="ml-1 text-slate-400">{plan.evidence.length}</span></button></div>
            {tab === "plan" ? <div id="plan-view" role="tabpanel" aria-labelledby="plan-tab" className="p-5 sm:p-7"><ol className="space-y-7">{plan.steps.map((step, index) => <li key={step.id} className="flex gap-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-xs font-semibold text-slate-500">{index + 1}</span><div className="min-w-0 flex-1"><span className={`mb-2 inline-block rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${step.kind === "observed" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-800"}`}>{step.kind === "observed" ? "From the source" : "Inferred · proposed addition"}</span><p className="text-sm font-medium leading-relaxed">{step.instruction}</p><div className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-slate-500"><CheckCircle2 size={13} className="mt-0.5 shrink-0 text-slate-400" /><span>Check: {step.verification}</span></div>{step.evidenceIds.length > 0 && <div className="mt-2.5 flex flex-wrap gap-1.5">{step.evidenceIds.map((id) => <button key={id} onClick={() => { setSelectedEvidence(id); setTab("evidence"); }} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[10px] text-blue-700 hover:bg-blue-100"><FileText size={10} />{id}<ChevronRight size={10} /></button>)}</div>}</div></li>)}</ol><div className="mt-7 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4"><h3 className="mb-3 flex items-center gap-2 text-sm"><CheckCircle2 size={16} className="text-emerald-700" />What success looks like</h3><ul className="space-y-2">{plan.successCriteria.map((item, i) => <li key={i} className="flex gap-2 text-xs leading-relaxed text-slate-600"><Circle size={12} className="mt-0.5 shrink-0 text-emerald-600" />{item}</li>)}</ul><p className="mt-3 text-[10px] text-slate-500">Acceptance checks, not completed results.</p></div></div> : <div id="evidence-view" role="tabpanel" aria-labelledby="evidence-tab" className="p-5 sm:p-7"><p className="mb-5 text-xs leading-relaxed text-slate-500">These excerpts were captured during analysis. Frame observations are model-generated; they may miss details. Timestamps appear only when stored.</p><ul className="space-y-3">{plan.evidence.map((item) => <li key={item.id} ref={(node) => { evidenceRefs.current[item.id] = node; }} className={`scroll-mt-24 rounded-xl border p-4 ${selectedEvidence === item.id ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50/50"}`}><div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[10px]"><span className="font-semibold uppercase tracking-wider text-slate-500">{item.id} · {item.kind}</span><a href={sourceAt(plan.sourceUrl, item.timestampSec)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-700">{timestamp(item.timestampSec)}<ExternalLink size={10} /></a></div><p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700">{item.text}</p></li>)}</ul></div>}
          </section> : <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><ArrowRight size={23} /></div><h2 className="text-base">A saved link can become a finished thing.</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">Choose an outcome above. We’ll connect the source to a practical plan you can review, adapt, and take into your workspace.</p></div>}
        </div>

        <aside className="min-w-0 space-y-5">
          <section className="rounded-2xl bg-slate-950 p-5 text-white sm:p-6"><div className="mb-4 flex items-center gap-2"><Monitor size={19} className="text-blue-400" /><h2 className="text-base">From plan to your computer</h2></div><p className="text-xs leading-relaxed text-slate-400">Build in a local workspace or walk through the task in a visible browser. Review each proposed browser action before it happens.</p><div className="my-5 flex items-center gap-2 text-[10px]"><span className="text-blue-300">01 Prepare</span><ChevronRight size={12} className="text-slate-600" /><span className="text-slate-400">02 Run locally</span><ChevronRight size={12} className="text-slate-600" /><span className="text-slate-400">03 Verify</span></div>
            <div className="mb-4 grid gap-2"><button type="button" disabled={sessionOpen} onClick={() => { setExecutor("browser"); setReviewed(false); }} aria-pressed={executor === "browser"} className={`flex items-center gap-2 rounded-xl border p-3 text-left text-xs ${executor === "browser" ? "border-blue-500 bg-blue-950 text-blue-200" : "border-slate-700 text-slate-400"}`}><Monitor size={16} /><span><strong className="block">Browser walkthrough</strong><span className="mt-1 block text-[10px] font-normal">Open pages, scroll, and review proposed actions</span></span></button><button type="button" disabled={sessionOpen} onClick={() => { setExecutor("terminal"); setReviewed(false); }} aria-pressed={executor === "terminal"} className={`flex items-center gap-2 rounded-xl border p-3 text-left text-xs ${executor === "terminal" ? "border-blue-500 bg-blue-950 text-blue-200" : "border-slate-700 text-slate-400"}`}><Terminal size={16} /><span><strong className="block">Build in Terminal</strong><span className="mt-1 block text-[10px] font-normal">{harnessName} in a fresh project workspace</span></span></button></div>
            {executor === "terminal" && <div className="mb-4"><label htmlFor="coding-harness" className="mb-2 block text-xs font-semibold text-slate-300">Coding app</label><select id="coding-harness" value={harness} disabled={sessionOpen || launchBusy} onChange={(event) => { setHarness(event.target.value as Harness); setReviewed(false); setLocalError(""); }} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500"><option value="codex">Codex{paired && !harnesses.codex ? " · unavailable" : ""}</option><option value="claude">Claude Code{paired && !harnesses.claude ? " · unavailable" : ""}</option></select><p className="mt-2 text-[10px] leading-relaxed text-slate-400">{harness === "claude" ? "Opens Claude Code in plan mode. Review its proposal in Terminal before allowing setup or code changes. It uses your existing Claude sign-in." : "Opens Codex in a fresh workspace with its existing permissions and sign-in."}</p></div>}
            {executor === "browser" && <p className="mb-4 rounded-lg border border-slate-700 bg-slate-900 p-3 text-[10px] leading-relaxed text-slate-300">Browser guidance sends screenshots and visible page text to OpenAI using your local API key. Enter logins and private fields directly in the isolated browser.</p>}
            {demo ? <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs leading-relaxed text-slate-400">Demo launch is disabled. Open one of your completed analyses to prepare a real task.</div> : <>
              {initialPairingToken ? <div className="mb-5 rounded-xl border border-slate-700 bg-slate-900 p-3"><p className="flex items-center gap-2 text-xs font-semibold text-slate-200"><Monitor size={14} className="text-blue-400" />{paired ? "Mac connected" : "Local companion detected"}{paired && <Check size={14} className="text-emerald-400" />}</p><p className="my-3 text-[10px] leading-relaxed text-slate-400">Pairing stays in this page’s memory. No browser storage is used.</p>{paired ? <button className="inline-flex items-center gap-1 text-xs text-slate-400" onClick={() => setPaired(false)}><Unplug size={12} />Disconnect</button> : <button onClick={pair} disabled={pairBusy || token.trim().length < 16} className="w-full rounded-lg bg-slate-800 px-3 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50">{pairBusy ? "Connecting…" : "Connect this Mac"}</button>}</div> : <>
              <button onClick={() => setShowSetup(!showSetup)} className="mb-4 flex w-full items-center justify-between rounded-lg border border-slate-700 p-3 text-xs text-slate-200"><span className="flex items-center gap-2"><Monitor size={14} />{paired ? "Mac connected" : "Connect this Mac"}</span>{paired ? <Check size={14} className="text-emerald-400" /> : <ChevronRight size={14} />}</button>
              {showSetup && <div className="mb-5 space-y-3"><p className="text-xs leading-relaxed text-slate-400">In the project folder, start the companion. Terminal tasks require {harnessName} installed and signed in. Browser walkthroughs require OPENAI_API_KEY in the companion’s local environment.</p><pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-slate-900 p-3 text-[10px] leading-relaxed text-blue-200">npm run companion -- --origin {origin}</pre><label htmlFor="companion-token" className="block text-xs text-slate-300">Paste the pairing token printed in Terminal</label><input id="companion-token" type="password" value={token} onChange={(e) => { setToken(e.target.value); setPaired(false); }} autoComplete="off" maxLength={256} placeholder="Local pairing token" className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-xs text-white outline-none focus:border-blue-500" /><p className="text-[10px] leading-relaxed text-slate-500">Kept in this page’s memory. Sent only to the local companion. Closing or refreshing this page clears it.</p><button onClick={pair} disabled={pairBusy || token.trim().length < 16} className="rounded-lg bg-slate-800 px-3 py-2 text-xs text-white disabled:opacity-50">{pairBusy ? "Connecting…" : "Connect"}</button>{paired && <button className="ml-3 inline-flex items-center gap-1 text-xs text-slate-400" onClick={() => { setPaired(false); setToken(""); }}><Unplug size={12} />Disconnect</button>}</div>}
              </>}
              {paired && executor === "terminal" && !terminalAvailable && <p className="mb-3 text-xs leading-relaxed text-amber-300">Terminal launch requires {harness === "codex" ? "Codex CLI" : "Claude Code with safe-mode support"} installed and signed in on macOS. Reconnect after starting the updated companion, or choose an available coding app.</p>}
              {paired && executor === "browser" && !browserConfigured && <p className="mb-3 text-xs leading-relaxed text-amber-300">The browser planner is not configured. Add OPENAI_API_KEY to the companion’s environment, restart it, then reconnect.</p>}
              <label className="mb-4 flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-slate-300"><input type="checkbox" checked={reviewed} disabled={!plan || !!stale || sessionOpen} onChange={(e) => setReviewed(e.target.checked)} className="mt-0.5 accent-blue-500" /><span>I reviewed the plan and its gaps. Start this task on my computer.</span></label><button onClick={launch} disabled={!plan || !!stale || !paired || !reviewed || launchBusy || sessionOpen || (executor === "browser" && !browserConfigured) || (executor === "terminal" && !terminalAvailable)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500">{launchBusy ? <Loader2 size={16} className="animate-spin" /> : executor === "browser" ? <Monitor size={16} /> : <Terminal size={16} />}{launchBusy ? "Opening session…" : executor === "browser" ? "Start browser walkthrough" : "Open in Terminal"}</button>
            </>}
            {localError && <p role="alert" className="mt-3 rounded-lg border border-red-900 bg-red-950/40 p-3 text-xs leading-relaxed text-red-200">{localError}</p>}
            {run && executor === "browser" && <div className="mt-4 rounded-xl border border-blue-900 bg-blue-950/40 p-3"><p className="mb-2 text-xs text-blue-200">{run.status === "stopped" ? "Browser closed" : "Your browser session is open"}</p><button type="button" onClick={() => browserSessionDialog.current?.showModal()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-3 py-2.5 text-xs font-semibold hover:bg-blue-400"><Monitor size={14} />View browser session</button></div>}
            {run && executor === "terminal" && <div aria-live="polite" className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-3"><p className="text-xs font-semibold text-blue-200">{run.status === "launching" ? `${runHarnessName} launch requested` : run.status === "running" ? `${runHarnessName} session active` : run.status === "failed" ? `${runHarnessName} session failed` : `${runHarnessName} session ended · outcome unverified`}</p><p className="mt-2 text-[10px] leading-relaxed text-slate-400">{run.error || run.message || "Check Terminal for the current prompt and actual progress. An active session may be waiting for your input; an ended session does not verify the result."}</p>{run.workspace && <p className="mt-2 break-all font-mono text-[10px] text-slate-300">{run.workspace}</p>}</div>}
            <p className="mt-4 text-[10px] leading-relaxed text-slate-500">macOS companion preview. Browser control works in its own visible browser. Other native desktop apps are not controlled by this runner.</p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="mb-3 text-sm">Before you start</h2>{plan?.prerequisites.length ? <ul className="space-y-2.5">{plan.prerequisites.map((item, i) => <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-slate-600"><Circle size={11} className="mt-1 shrink-0 text-slate-400" />{item}</li>)}</ul> : <p className="text-xs leading-relaxed text-slate-500">Required tools, inputs, and accounts will appear with your plan.</p>}</section>
          <section className="rounded-2xl border border-amber-200/70 bg-amber-50/50 p-5"><h2 className="mb-3 text-sm text-amber-950">Source gaps & assumptions</h2><ul className="space-y-2.5">{(plan?.warnings ?? captured.warnings).map((item, i) => <li key={i} className="text-xs leading-relaxed text-amber-900/80">{item}</li>)}</ul></section>
          {plan && <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-sm">Take the plan with you</h2><p className="mb-4 mt-2 text-xs leading-relaxed text-slate-500">A portable handoff with evidence and acceptance checks. Exporting does not execute it.</p><div className="flex gap-2"><button disabled={!!stale} onClick={() => download(JSON.stringify(plan, null, 2), `contextdrop-${analysis.id}.json`, "application/json")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50 disabled:opacity-40"><Download size={13} />JSON</button><button disabled={!!stale} onClick={() => download(replicationPlanMarkdown(plan), `contextdrop-${analysis.id}.md`, "text/markdown")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50 disabled:opacity-40"><Download size={13} />Markdown</button></div></section>}
        </aside>
      </div>
      {run && executor === "browser" && <BrowserSession run={run} dialogRef={browserSessionDialog} actionBusy={actionBusy} error={localError} sourceTitle={String(sourceTitle)} planTitle={plan?.title ?? "Prepared task"} onControl={controlRun} />}
    </div>
  );
}
