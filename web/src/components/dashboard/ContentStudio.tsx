"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowUp, ArrowUpRight, Check, ChevronDown, Clock3, Film, Loader2, MessageCircle, Search, X } from "lucide-react";
import Markdown from "@/components/chat/Markdown";
import type { Analysis } from "@/lib/types";
import type { ContentAction, ContentConversation } from "@/lib/content-conversation";
import type { ReplicationPlan } from "@/lib/execution-plan";
const ReplicationPanel = dynamic(() => import("./ReplicationPanel"), { loading: () => <p className="p-6 text-sm text-stone-400">Opening task preparation…</p> });

type Observation = { timestampSec?: number; description?: string; onScreenText?: string[]; uncertain?: boolean };
function time(seconds: number) { return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`; }
function sourceMoment(source: string, seconds: number) { const url = new URL(source); if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(url.hostname)) url.searchParams.set("t", `${Math.floor(seconds)}s`); return url.href; }

export default function ContentStudio({ analysis, pairingToken, savedPlan }: { analysis: Analysis; pairingToken?: string; savedPlan?: ReplicationPlan }) {
  const [conversation, setConversation] = useState<ContentConversation>({ version: 1, analysisId: analysis.id, messages: [] });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");
  const [action, setAction] = useState<ContentAction | null>(null);
  const [frame, setFrame] = useState<number | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const task = useRef<HTMLDivElement>(null);
  const observations = (analysis.frame_descriptions ?? []) as Observation[];
  const local = analysis.metadata?.local_evidence as { framePaths?: string[] } | undefined;
  const duration = Number(analysis.metadata?.duration ?? 0);
  const lastReply = [...conversation.messages].reverse().find(message => message.reply)?.reply;
  const title = String(analysis.metadata?.title || analysis.caption?.slice(0, 120) || "Your saved content");
  const started = useRef(false);
  const imageUrl = (index: number) => `/api/local/frames/${index}?analysisId=${encodeURIComponent(analysis.id)}`;

  async function send(message: string, brief = false) {
    if (!brief && !message.trim()) return;
    setBusy(true); setError(""); setPending(brief ? "" : message);
    try {
      const response = await fetch("/api/local/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ analysisId: analysis.id, ...(brief ? { brief: true } : { message }) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not finish the reply.");
      if (data.analysisId !== analysis.id) throw new Error("The source changed. Refresh the page.");
      setConversation(data); setInput("");
    } catch (e) { setError(e instanceof Error ? e.message : "Connection lost. Your saved conversation is still here."); }
    finally { setBusy(false); setPending(""); }
  }
  useEffect(() => {
    if (started.current) return; started.current = true;
    void (async () => {
      try {
        const response = await fetch("/api/local/chat", { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load this conversation.");
        const data = await response.json();
        if (data.analysisId !== analysis.id) throw new Error("The source changed. Refresh the page.");
        setConversation(data);
        if (!data.messages.length) { await send("", true); return; }
      } catch (e) { setError(e instanceof Error ? e.message : "Could not load this conversation."); }
      setBusy(false);
    })();
  // The component is keyed by capture identity. A source gets one initial take.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (conversation.messages.length > 1 || pending) end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [conversation.messages.length, pending]);
  useEffect(() => { if (action) task.current?.scrollIntoView({ block: "start", behavior: "smooth" }); }, [action]);

  return <>
    <div className="grid items-start gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-white/10 bg-[#141210] p-5">
        <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-orange-400"><Film size={14} /> Your content</div>
        {local?.framePaths?.length ? <button type="button" onClick={() => setFrame(0)} className="mb-4 hidden w-full overflow-hidden rounded-xl border border-white/10 lg:block"><img src={imageUrl(0)} className="aspect-video w-full object-cover" alt="First sampled source frame" /></button> : null}
        <h2 className="text-sm font-semibold leading-relaxed text-stone-100">{title}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-400"><span className="capitalize">{analysis.platform}</span>{duration > 0 && <><span>·</span><Clock3 size={12} /><span>{time(duration)} video</span></>}</div>
        <a href={analysis.source_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs text-orange-300 hover:underline">Open original <ArrowUpRight size={13} /></a>
        <div className="my-5 border-t border-white/10" />
        <button onClick={() => setShowEvidence(!showEvidence)} aria-expanded={showEvidence} className="flex w-full items-center justify-between gap-2 text-left text-xs text-stone-300">What was captured <ChevronDown size={14} className={showEvidence ? "rotate-180" : ""} /></button>
        {showEvidence && <div className="mt-3 space-y-3 text-xs leading-relaxed text-stone-400"><p>{observations.length ? `${observations.length} timestamped screen observations.` : "Public page text."} {analysis.transcript ? "Audio transcript captured." : "No separate audio transcript."}</p><p>Images are sampled. A name that appears briefly can be missed. Ask me to inspect a specific moment.</p>{observations.length > 0 && <div className="flex flex-wrap gap-2">{[...new Set([0, Math.floor(observations.length / 3), Math.floor(observations.length * 2 / 3), observations.length - 1])].map(index => <button key={index} onClick={() => setFrame(index)} className="rounded-md border border-white/10 px-2 py-1 hover:border-orange-500/50">{time(observations[index]?.timestampSec ?? 0)}</button>)}</div>}<p>Analysis finished {new Date(analysis.completed_at ?? analysis.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. This is processing status, not video length.</p></div>}
        <p className="mt-5 flex items-center gap-1.5 text-[11px] text-emerald-400"><Check size={13} /> Conversation saved on this Mac</p>
      </aside>

      <section aria-label="Chat with your content" className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#141210]">
        <header className="flex items-center gap-2 border-b border-white/10 px-6 py-4 text-sm font-medium text-stone-200"><MessageCircle size={16} className="text-orange-400" /> What should we do with this?</header>
        <div className="max-h-[640px] min-h-[180px] space-y-6 overflow-y-auto px-5 py-6 sm:px-7" aria-live="polite" aria-busy={busy}>
          {conversation.messages.map(message => <article key={message.id} className={message.role === "user" ? "ml-6 rounded-2xl rounded-br-sm border border-orange-500/15 bg-orange-500/10 p-4 text-sm text-stone-100" : "text-sm leading-relaxed text-stone-300"}>
            <p className={`mb-2 text-[10px] font-bold uppercase tracking-wider ${message.role === "user" ? "text-orange-300" : "text-stone-500"}`}>{message.role === "user" ? "You" : "ContextDrop"}</p>
            <Markdown allowedUrls={message.reply?.allowedUrls ?? []}>{message.text}</Markdown>
            {!!message.activity?.length && <p className="mt-3 flex items-center gap-2 text-[10px] text-stone-500"><Search size={11} /> {message.activity.join(" · ")}</p>}
            {!!message.reply?.evidence.length && <div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-[10px] text-stone-500">In the source</span>{message.reply.evidence.map(index => <button key={index} onClick={() => setFrame(index)} className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-orange-300 hover:border-orange-400/50">{time(observations[index]?.timestampSec ?? 0)}</button>)}</div>}
            {!!message.reply?.actions.length && <div className="mt-4 grid gap-2 sm:grid-cols-2">{message.reply.actions.map(item => item.kind === "open_url" ? <a key={item.id} href={item.url!} target="_blank" rel="noreferrer" className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 hover:border-orange-400/50"><span className="flex items-center justify-between gap-2 text-xs font-semibold text-orange-200">{item.label}<ArrowUpRight size={14} /></span><span className="mt-1 block text-[11px] text-stone-400">{item.detail}</span></a> : <button key={item.id} onClick={() => setAction(item)} className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 text-left hover:border-orange-400/50"><span className="flex items-center justify-between gap-2 text-xs font-semibold text-orange-200">{item.label}<ArrowUpRight size={14} /></span><span className="mt-1 block text-[11px] text-stone-400">{item.detail}</span><span className="mt-2 block text-[10px] text-stone-500">Review a plan first</span></button>)}</div>}
          </article>)}
          {pending && <p className="ml-6 rounded-xl bg-orange-500/10 p-4 text-sm text-stone-300">{pending}</p>}
          {busy && <p role="status" className="flex items-center gap-2 py-2 text-sm text-stone-400"><Loader2 size={16} className="animate-spin text-orange-400" />{conversation.messages.length ? "Reading the evidence and checking the details…" : "Finding what’s useful in your content…"}</p>}
          <div ref={end} />
        </div>
        <div className="border-t border-white/10 p-5">
          {error && <div role="alert" className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs leading-relaxed text-red-200">{error}{!conversation.messages.length && !busy && <button onClick={() => send("", true)} className="mt-2 block underline">Try the quick take again</button>}</div>}
          {!!lastReply?.suggestions.length && <div className="mb-4 flex flex-wrap gap-2">{lastReply.suggestions.map(suggestion => <button key={suggestion} disabled={busy} onClick={() => send(suggestion)} className="max-w-full rounded-full border border-white/10 px-3 py-2 text-left text-xs text-stone-300 transition hover:border-orange-500/50 hover:text-orange-200 disabled:opacity-40">{suggestion}</button>)}</div>}
          <form onSubmit={event => { event.preventDefault(); if (!busy) void send(input.trim()); }} className="flex items-end gap-3 rounded-xl border border-white/15 bg-[#0c0b0a] p-3 focus-within:border-orange-500/60">
            <textarea aria-label="Ask about your content" rows={2} maxLength={4000} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (!busy && input.trim()) void send(input.trim()); } }} placeholder="Find that repo. Explain the skill. Help me try this…" className="min-w-0 flex-1 resize-none bg-transparent text-sm leading-relaxed text-stone-100 outline-none placeholder:text-stone-600" />
            <button aria-label="Send message" disabled={busy || !input.trim()} className="rounded-lg bg-orange-500 p-2.5 text-white transition hover:bg-orange-400 disabled:opacity-30"><ArrowUp size={18} /></button>
          </form>
          <p className="mt-3 text-[10px] leading-relaxed text-stone-500">Ask freely. Computer actions begin only when you choose and approve a task.</p>
        </div>
      </section>
    </div>
    {action && <div ref={task} className="mt-8 scroll-mt-4 rounded-2xl bg-[#f7f8fb] p-5 sm:p-7"><div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-orange-700">Your chosen action</p><h2 className="mt-1 text-lg font-semibold text-slate-900">{action.label}</h2></div><button aria-label="Close task preparation" onClick={() => setAction(null)} className="rounded-full border border-slate-300 p-2 text-slate-500"><X size={18} /></button></div><ReplicationPanel key={action.id} analysis={analysis} initialPlan={savedPlan?.goal === action.goal && savedPlan?.mode === action.mode ? savedPlan : undefined} initialGoal={action.goal ?? ""} initialMode={action.mode} initialHarness={action.harness ?? "claude"} planningEndpoint="/api/local/replicate" initialExecutor={action.executor ?? (/\b(claude code|codex)\b/i.test(action.goal ?? "") ? "terminal" : action.mode === "research" ? "browser" : "terminal")} initialPairingToken={pairingToken} planningNotice="A reviewed task can open your Mac browser or coding agent. This is local execution, not a cloud sandbox." /></div>}
    {frame !== null && observations[frame] && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setFrame(null)}><section role="dialog" aria-modal="true" aria-label="Source evidence" className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/15 bg-[#141210] p-5" onClick={event => event.stopPropagation()}><div className="mb-4 flex justify-between gap-4"><h3 className="text-sm font-semibold">Source evidence · {time(observations[frame].timestampSec ?? 0)}</h3><button autoFocus aria-label="Close source evidence" onClick={() => setFrame(null)} onKeyDown={event => { if (event.key === "Escape") setFrame(null); }}><X size={20} /></button></div>{local?.framePaths?.[frame] && <img src={imageUrl(frame)} alt={`Captured source at ${time(observations[frame].timestampSec ?? 0)}`} className="mb-4 max-h-[55vh] w-full rounded-lg bg-black object-contain" />}<p className="text-sm leading-relaxed text-stone-300">{observations[frame].description}</p>{!!observations[frame].onScreenText?.length && <p className="mt-3 text-xs leading-relaxed text-stone-400">Visible text: {observations[frame].onScreenText?.join(" · ")}</p>}<p className="mt-3 text-xs text-stone-500">AI-extracted observation{observations[frame].uncertain ? " · marked uncertain" : " · check the original for exact details"}.</p><a href={sourceMoment(analysis.source_url, observations[frame].timestampSec ?? 0)} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm text-orange-400">Open this moment in the source <ArrowUpRight size={14} /></a></section></div>}
  </>;
}
