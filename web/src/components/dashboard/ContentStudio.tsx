"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { ArrowUp, ArrowUpRight, Bookmark, Check, ChevronDown, Clock3, FileText, Film, Loader2, MessageCircle, Search, X } from "lucide-react";
import Markdown from "@/components/chat/Markdown";
import type { Analysis } from "@/lib/types";
import { publicLink, type ContentAction, type ContentConversation } from "@/lib/content-conversation";
import type { ReplicationPlan } from "@/lib/execution-plan";
import StudioDialog from "./StudioDialog";
import styles from "./studio.module.css";
const ReplicationPanel = dynamic(() => import("./ReplicationPanel"), { loading: () => <p className={styles.thinking}>Opening task preparation…</p> });

type Observation = { timestampSec?: number; description?: string; onScreenText?: string[]; uncertain?: boolean };
type SelectedAction = ContentAction & { contextSourceIds?: string[] };
function time(seconds: number) { return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`; }
function sourceMoment(source: string, seconds: number): string | null { const link = publicLink(source); if (!link) return null; const url = new URL(link); if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(url.hostname)) url.searchParams.set("t", `${Math.floor(seconds)}s`); return url.href; }
function scrollBehavior(): ScrollBehavior { return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"; }

export default function ContentStudio({ analysis, pairingToken, savedPlan }: { analysis: Analysis; pairingToken?: string; savedPlan?: ReplicationPlan }) {
  const [conversation, setConversation] = useState<ContentConversation>({ version: 1, analysisId: analysis.id, messages: [] });
  const [input, setInput] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");
  const [action, setAction] = useState<SelectedAction | null>(null);
  const [frame, setFrame] = useState<number | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [workflowNotice, setWorkflowNotice] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const task = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const scrollForReply = useRef(false);
  const observations = (analysis.frame_descriptions ?? []) as Observation[];
  const local = analysis.metadata?.local_evidence as { framePaths?: string[] } | undefined;
  const sourceEvidence = analysis.metadata?.source_evidence as { native_video?: unknown; media_kind?: string; warnings?: string[] } | undefined;
  const duration = Number(analysis.metadata?.duration ?? 0);
  const native = !!sourceEvidence?.native_video;
  const lastReply = [...conversation.messages].reverse().find(message => message.reply)?.reply;
  const title = String(analysis.metadata?.title || analysis.caption?.slice(0, 120) || "Your saved content");
  const started = useRef(false);
  const imageUrl = (index: number) => `/api/local/frames/${index}?analysisId=${encodeURIComponent(analysis.id)}`;
  const sourceUrl = publicLink(analysis.source_url);
  const selectedObservation = frame !== null ? observations[frame] : null;
  const originalMoment = selectedObservation ? sourceMoment(analysis.source_url, selectedObservation.timestampSec ?? 0) : null;

  async function send(message: string, brief = false) {
    if (!brief && !message.trim()) return;
    setBusy(true); setError(""); setPending(brief ? "" : message); scrollForReply.current = !brief;
    try {
      const response = await fetch("/api/local/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ analysisId: analysis.id, ...(brief ? { brief: true } : { message }) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not finish the reply.");
      if (data.analysisId !== analysis.id) throw new Error("The source changed. Refresh the page.");
      setConversation(data);
      // A reply can arrive while the user is writing their next question.
      // Clear only the draft that was sent, never newer writing or a quick-take draft.
      if (!brief) setInput(current => current.trim() === message ? "" : current);
    } catch (e) { setError(e instanceof Error ? e.message : "Connection lost. Your saved conversation is still here."); }
    finally { setBusy(false); setPending(""); }
  }
  useEffect(() => {
    try { setInput((sessionStorage.getItem(`contextdrop:draft:${analysis.id}`) ?? "").slice(0, 4000)); }
    catch { /* Browsers can disable session storage; editing still works. */ }
    setDraftReady(true);
  }, [analysis.id]);
  useEffect(() => {
    if (!draftReady) return;
    try {
      const key = `contextdrop:draft:${analysis.id}`;
      if (input) sessionStorage.setItem(key, input.slice(0, 4000));
      else sessionStorage.removeItem(key);
    } catch { /* Keep the live draft even when local persistence is unavailable. */ }
  }, [analysis.id, draftReady, input]);
  async function saveWorkflow(messageId: string) {
    setSaving(messageId); setWorkflowNotice("");
    try {
      const response = await fetch("/api/local/workflows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ analysisId: analysis.id, messageId }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not save this workflow.");
      setSaved(current => new Set([...current, messageId])); setWorkflowNotice("Saved as a draft workflow. Find it in Workflows above.");
    } catch (error) { setWorkflowNotice(error instanceof Error ? error.message : "Could not save this workflow."); }
    finally { setSaving(null); }
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
  useEffect(() => { if (scrollForReply.current) end.current?.scrollIntoView({ block: "nearest", behavior: scrollBehavior() }); }, [conversation.messages.length, pending]);
  useEffect(() => { if (action) task.current?.scrollIntoView({ block: "start", behavior: scrollBehavior() }); }, [action]);
  useEffect(() => {
    const apply = (event: Event) => {
      const detail = (event as CustomEvent<{ title?: string; instructions?: string }>).detail;
      if (!detail || typeof detail.instructions !== "string") return;
      setInput(`Help me adapt the saved workflow “${String(detail.title ?? "My workflow").slice(0, 100)}” to this content. Explain the fit and propose a next step before any action.\n\nSaved workflow for reference:\n${detail.instructions}`.slice(0, 4000));
      window.setTimeout(() => { composer.current?.focus(); composer.current?.scrollIntoView({ block: "center", behavior: scrollBehavior() }); }, 0);
    };
    window.addEventListener("contextdrop:workflow", apply); return () => window.removeEventListener("contextdrop:workflow", apply);
  }, []);

  return <>
    <div className={styles.workspace}>
      <section aria-label="Chat with your content" className={styles.chat}>
        <header className={styles.chatHeader}><h2 className={styles.chatTitle}><MessageCircle size={17} /> Make something of it</h2><span className={styles.chatSaved}><Check size={12} /> Saved on this Mac</span></header>
        <div className={styles.messages} aria-live="polite" aria-busy={busy}>
          {conversation.messages.map(message => <article key={message.id} className={`${styles.message} ${message.role === "user" ? styles.messageUser : ""}`}>
            <p className={styles.speaker}>{message.role === "user" ? "You" : "ContextDrop"}</p>
            <Markdown allowedUrls={message.reply?.allowedUrls ?? []}>{message.text}</Markdown>
            {!!message.activity?.length && <p className={styles.messageActivity}><Search size={12} /> {message.activity.join(" · ")}</p>}
            {!!message.reply?.actions.length && <div className={styles.actions}>{message.reply.actions.map(item => item.kind === "open_url" ? <a key={item.id} href={item.url!} target="_blank" rel="noreferrer" className={styles.action}><span>{item.label}<ArrowUpRight size={14} /></span><span>{item.detail}</span></a> : <button type="button" key={item.id} onClick={() => setAction({ ...item, contextSourceIds: message.reply?.sourceReferences?.map(reference => reference.analysisId).slice(0, 3) })} className={styles.action}><span>{item.label}<ArrowUpRight size={14} /></span><span>{item.detail}</span><small>Review a plan first</small></button>)}</div>}
            {!!message.reply?.sourceReferences?.length && <div className={styles.sourceReferences}>{message.reply.sourceReferences.map(reference => <span key={reference.analysisId} className={styles.evidenceNote}>{publicLink(reference.sourceUrl) && message.reply?.allowedUrls?.includes(reference.sourceUrl) ? <a href={reference.sourceUrl} target="_blank" rel="noreferrer" className={styles.sourceLink}><FileText size={12} />{reference.title}<ArrowUpRight size={12} /></a> : <>Also used: {reference.title}</>}</span>)}</div>}
            {message.role === "assistant" && <div className={styles.messageFooter}>{!!message.reply?.evidence.length && <><span className={styles.evidenceNote} style={{ margin: 0 }}>Source moments</span>{message.reply.evidence.map(index => <button type="button" key={index} onClick={() => setFrame(index)} className={styles.evidenceButton}>{time(observations[index]?.timestampSec ?? 0)}</button>)}</>}<button type="button" className={styles.textButton} disabled={saving !== null || saved.has(message.id)} onClick={() => void saveWorkflow(message.id)}>{saving === message.id ? <Loader2 size={13} className={styles.spinner} /> : saved.has(message.id) ? <Check size={13} /> : <Bookmark size={13} />}{saved.has(message.id) ? "Workflow saved" : "Save workflow"}</button></div>}
          </article>)}
          {pending && <article className={`${styles.message} ${styles.messageUser}`}><p className={styles.speaker}>You</p>{pending}</article>}
          {busy && <p role="status" className={styles.thinking}><Loader2 size={16} className={styles.spinner} />{conversation.messages.length ? "Checking the evidence and useful next steps…" : "Finding what’s useful in your content…"}</p>}
          <div ref={end} />
        </div>
        <div className={styles.composerArea}>
          {error && <div role="alert" className={styles.error} style={{ marginBottom: "1rem" }}>{error}{!conversation.messages.length && !busy && <button type="button" onClick={() => send("", true)} className={styles.textButton}>Try the quick take again</button>}</div>}
          {workflowNotice && <p role="status" className={styles.evidenceNote} style={{ marginBottom: ".8rem" }}>{workflowNotice}</p>}
          {!!lastReply?.suggestions.length && <div className={styles.suggestions}>{lastReply.suggestions.map(suggestion => <button type="button" key={suggestion} disabled={busy} onClick={() => send(suggestion)} className={styles.suggestion}>{suggestion}</button>)}</div>}
          <form onSubmit={event => { event.preventDefault(); if (!busy) void send(input.trim()); }} className={styles.composer}>
            <textarea ref={composer} aria-label="Ask about your content" rows={2} maxLength={4000} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (!busy && input.trim()) void send(input.trim()); } }} placeholder="Ask anything. Find a tool, explore an idea, make your version…" />
            <button aria-label="Send message" disabled={busy || !input.trim()} className={styles.sendButton}><ArrowUp size={19} /></button>
          </form>
          <p className={styles.composerHint}>You choose what happens next. Computer actions start with a reviewed plan.</p>
        </div>
      </section>
      <aside aria-label="Current source" className={styles.source}>
        <div className={styles.sourceLabel}>{duration > 0 ? <Film size={14} /> : <FileText size={14} />} Your source</div>
        {local?.framePaths?.length ? <button type="button" onClick={() => setFrame(0)} className={styles.sourcePreview}><Image unoptimized src={imageUrl(0)} width={1280} height={720} alt="First sampled source frame" /></button> : null}
        <h2>{title}</h2>
        <div className={styles.sourceMeta}><span>{analysis.source_url.startsWith("contextdrop:") ? "Uploaded file" : analysis.platform}</span>{duration > 0 && <><span>·</span><Clock3 size={12} /><span>{time(duration)}</span></>}</div>
        {sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer" className={styles.sourceLink}>Open original <ArrowUpRight size={13} /></a>}
        <details className={styles.sourceDetails}><summary>What ContextDrop read <ChevronDown size={14} /></summary>
          <p>{native ? `Audio and visual content, with ${observations.length} timestamped observations.` : observations.length ? `${observations.length} visual observations.${analysis.transcript ? " Audio transcript included." : ""}` : "Readable source text."}</p>
          {observations.length > 0 && <><p>Visual details are sampled. Ask to inspect a moment more closely when a detail matters.</p><div className={styles.sourceMoments}>{[...new Set([0, Math.floor(observations.length / 3), Math.floor(observations.length * 2 / 3), observations.length - 1])].map(index => <button type="button" key={index} onClick={() => setFrame(index)} className={styles.evidenceButton}>{time(observations[index]?.timestampSec ?? 0)}</button>)}</div></>}
          {!!sourceEvidence?.warnings?.length && <p>{sourceEvidence.warnings.join(" ")}</p>}
          <p>Your questions can guide a closer look. Source content is treated as information, not instructions to run.</p>
        </details>
      </aside>
    </div>
    {action && <div ref={task} className={styles.task}><div className={styles.taskHeader}><div><p className={styles.eyebrow}>Your chosen action</p><h2>{action.label}</h2></div><button type="button" aria-label="Close task preparation" onClick={() => { setAction(null); composer.current?.focus(); }} className={styles.iconButton}><X size={18} /></button></div><ReplicationPanel key={action.id} analysis={analysis} contextSourceIds={action.contextSourceIds} initialPlan={!action.contextSourceIds?.length && !savedPlan?.evidence.some(item => item.id.startsWith("source2-")) && savedPlan?.goal === action.goal && savedPlan?.mode === action.mode ? savedPlan : undefined} initialGoal={action.goal ?? ""} initialMode={action.mode} initialHarness={action.harness ?? "claude"} planningEndpoint="/api/local/replicate" initialExecutor={action.executor ?? (/\b(claude code|codex)\b/i.test(action.goal ?? "") ? "terminal" : action.mode === "research" ? "browser" : "terminal")} initialPairingToken={pairingToken} planningNotice="A reviewed task can open your Mac browser or coding agent. This is local execution, not a cloud sandbox." /></div>}
    {selectedObservation && frame !== null && <StudioDialog title={`Source evidence · ${time(selectedObservation.timestampSec ?? 0)}`} wide onClose={() => setFrame(null)}>{local?.framePaths?.[frame] && <Image unoptimized src={imageUrl(frame)} width={1280} height={720} style={{ height: "auto" }} alt={`Captured source at ${time(selectedObservation.timestampSec ?? 0)}`} className={styles.evidenceImage} />}<p className={styles.evidenceText}>{selectedObservation.description}</p>{!!selectedObservation.onScreenText?.length && <p className={styles.evidenceNote}>Visible text: {selectedObservation.onScreenText.join(" · ")}</p>}<p className={styles.evidenceNote}>AI-extracted observation{selectedObservation.uncertain ? " · marked uncertain" : " · check the original for exact details"}.</p>{originalMoment && <a href={originalMoment} target="_blank" rel="noreferrer" className={styles.sourceLink}>Open this moment in the source <ArrowUpRight size={14} /></a>}</StudioDialog>}
  </>;
}
