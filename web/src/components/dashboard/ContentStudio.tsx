"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { ArrowRight, ArrowUp, ArrowUpRight, Bookmark, Check, Clock3, FileText, Film, Lightbulb, Loader2, MessageCircle, Search, Sparkles } from "lucide-react";
import ContentAnswer from "./ContentAnswer";
import type { Analysis } from "@/lib/types";
import { publicLink, type ContentAction, type ContentConversation, type ContentMessage } from "@/lib/content-conversation";
import { parseContentGuide, type ContentChoice } from "@/lib/content-guide";
import { capturedFrameIndex } from "@/lib/source-frames";
import type { ReplicationPlan } from "@/lib/execution-plan";
import StudioDialog from "./StudioDialog";
import styles from "./studio.module.css";
import guided from "./guided.module.css";
const ReplicationPanel = dynamic(() => import("./ReplicationPanel"), { loading: () => <p className={styles.thinking}>Getting your task ready…</p> });

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
  const [sourceOpen, setSourceOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [workflowNotice, setWorkflowNotice] = useState("");
  const chat = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const started = useRef(false);
  const observations = (analysis.frame_descriptions ?? []) as Observation[];
  const previewIndex = observations.findIndex((_observation, index) => capturedFrameIndex(analysis, index) !== null);
  const sourceEvidence = analysis.metadata?.source_evidence as { native_video?: unknown; warnings?: string[] } | undefined;
  const duration = Number(analysis.metadata?.duration ?? 0);
  const title = String(analysis.metadata?.title || "Your saved content");
  const guide = conversation.guide;
  const imageUrl = (index: number) => `/api/local/frames/${index}?analysisId=${encodeURIComponent(analysis.id)}`;
  const sourceUrl = publicLink(analysis.source_url);
  const selectedObservation = frame !== null ? observations[frame] : null;
  const originalMoment = selectedObservation ? sourceMoment(analysis.source_url, selectedObservation.timestampSec ?? 0) : null;

  function acceptConversation(data: ContentConversation) {
    if (data.analysisId !== analysis.id || !Array.isArray(data.messages)) throw new Error("This link changed. Refresh the page.");
    // Stored suggestions are validated against this source before becoming controls.
    if (data.guide) { try { data.guide = parseContentGuide(data.guide, analysis); } catch { delete data.guide; } }
    setConversation(data);
    return data;
  }
  async function loadGuide() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/local/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ analysisId: analysis.id, guide: true }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn’t find your next steps. Try again.");
      acceptConversation(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn’t connect. Try again."); }
    finally { setBusy(false); }
  }
  async function send(message: string) {
    if (!message.trim() || busy) return;
    setBusy(true); setError(""); setPending(message); setChatOpen(true); setHistoryOpen(false);
    requestAnimationFrame(() => chat.current?.scrollIntoView({ block: "start", behavior: scrollBehavior() }));
    try {
      const response = await fetch("/api/local/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ analysisId: analysis.id, message }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn’t finish. Please try again.");
      acceptConversation(data);
      setInput(current => current.trim() === message ? "" : current);
    } catch (e) { setError(e instanceof Error ? e.message : "Connection lost. Your chat is saved."); }
    finally { setBusy(false); setPending(""); }
  }
  function choose(choice: ContentChoice) {
    if (busy) return;
    if (choice.kind === "ask") { void send(choice.request); return; }
    setAction({ id: choice.id, kind: "prepare_task", label: choice.label, detail: choice.detail, goal: choice.request, url: null, mode: choice.mode, executor: choice.executor, harness: "codex" });
  }
  useEffect(() => {
    try { setInput((sessionStorage.getItem(`contextdrop:draft:${analysis.id}`) ?? "").slice(0, 4000)); } catch { /* Live editing works without storage. */ }
    setDraftReady(true);
  }, [analysis.id]);
  useEffect(() => {
    if (!draftReady) return;
    try { const key = `contextdrop:draft:${analysis.id}`; if (input) sessionStorage.setItem(key, input.slice(0, 4000)); else sessionStorage.removeItem(key); } catch { /* Preserve the live draft. */ }
  }, [analysis.id, draftReady, input]);
  useEffect(() => {
    if (started.current) return; started.current = true;
    void (async () => {
      try {
        const response = await fetch("/api/local/chat", { cache: "no-store" });
        if (!response.ok) throw new Error("Couldn’t load your chat. Refresh to try again.");
        const data = acceptConversation(await response.json());
        if (!data.guide) { await loadGuide(); return; }
      } catch (e) { setError(e instanceof Error ? e.message : "Couldn’t load your chat."); }
      setBusy(false);
    })();
  // This component is keyed by the current source; one cached guide per source.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const apply = (event: Event) => {
      const detail = (event as CustomEvent<{ title?: string; instructions?: string }>).detail;
      if (!detail || typeof detail.instructions !== "string") return;
      setInput(`Help me adapt the saved workflow “${String(detail.title ?? "My workflow").slice(0, 100)}” to this content. Explain the fit and propose a next step before any action.\n\nSaved workflow for reference:\n${detail.instructions}`.slice(0, 4000));
      // Wait for the workflow dialog to close and restore its own focus first.
      window.setTimeout(() => { composer.current?.focus(); composer.current?.scrollIntoView({ block: "center", behavior: scrollBehavior() }); }, 0);
    };
    window.addEventListener("contextdrop:workflow", apply); return () => window.removeEventListener("contextdrop:workflow", apply);
  }, []);
  async function saveWorkflow(messageId: string) {
    setSaving(messageId); setWorkflowNotice("");
    try {
      const response = await fetch("/api/local/workflows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ analysisId: analysis.id, messageId }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Couldn’t save this.");
      setSaved(current => new Set([...current, messageId])); setWorkflowNotice("Saved. Find it in More → Workflows.");
    } catch (e) { setWorkflowNotice(e instanceof Error ? e.message : "Couldn’t save this."); }
    finally { setSaving(null); }
  }
  function renderMessage(message: ContentMessage) {
    return <article key={message.id} className={message.role === "user" ? guided.question : guided.answer}>
      <p className={guided.speaker}>{message.role === "user" ? "You" : "ContextDrop"}</p>
      <ContentAnswer allowedUrls={message.reply?.allowedUrls ?? []} text={message.text} />
      {!!message.reply?.actions.length && <div className={guided.replyActions}>{message.reply.actions.filter(item => item.kind !== "open_url" || (publicLink(item.url) && message.reply?.allowedUrls?.includes(item.url!))).map(item => <button type="button" key={item.id} onClick={() => setAction({ ...item, contextSourceIds: message.reply?.sourceReferences?.map(reference => reference.analysisId).slice(0, 3) })} className={styles.primaryButton}>{item.label}<ArrowUpRight size={17} /></button>)}</div>}
      {message.role === "assistant" && <details className={guided.replyDetails}><summary>Sources & saved steps</summary>
        {!!message.activity?.length && <p>{message.activity.join(" · ")}</p>}
        <div className={styles.sourceMoments}>{message.reply?.evidence.map(index => <button type="button" key={index} onClick={() => setFrame(index)} className={styles.evidenceButton}><Clock3 size={13} />{time(observations[index]?.timestampSec ?? 0)}</button>)}</div>
        {message.reply?.sourceReferences?.map(reference => <p key={reference.analysisId}>{publicLink(reference.sourceUrl) && message.reply?.allowedUrls?.includes(reference.sourceUrl) ? <a href={reference.sourceUrl} target="_blank" rel="noreferrer" className={styles.sourceLink}>{reference.title}<ArrowUpRight size={13} /></a> : reference.title}</p>)}
        {message.reply?.inspections?.map(inspection => <details key={inspection.id} className={styles.inspection}><summary>Closer look · {time(inspection.startSec)}–{time(inspection.endSec)}</summary><p>{inspection.summary}</p>{inspection.observations.map((observation, index) => <p key={index}><strong>{time(observation.timestampSec)}</strong> {observation.description}{observation.uncertain ? " (uncertain)" : ""}{observation.onScreenText.length ? ` · On screen: ${observation.onScreenText.join(" · ")}` : ""}{observation.speech ? ` · Speech summary: ${observation.speech}` : ""}</p>)}<p>{inspection.coverage}</p></details>)}
        <button type="button" className={styles.textButton} disabled={saving !== null || saved.has(message.id)} onClick={() => void saveWorkflow(message.id)}>{saving === message.id ? <Loader2 size={15} className={styles.spinner} /> : saved.has(message.id) ? <Check size={15} /> : <Bookmark size={15} />}{saved.has(message.id) ? "Saved" : "Save these steps"}</button>
      </details>}
    </article>;
  }
  return <section className={guided.content}>
    <div className={guided.sourceChip}>{duration > 0 ? <Film size={17} /> : <FileText size={17} />}<span>{analysis.source_url.startsWith("contextdrop:") ? "Uploaded file" : analysis.platform}</span>{duration > 0 && <span>· {time(duration)}</span>}<button type="button" onClick={() => setSourceOpen(true)}>What I read<ArrowUpRight size={14} /></button></div>
    {guide ? <>
      <div className={guided.heading}><h1>{guide.title}</h1><p>What would you like to do?</p></div>
      <div className={guided.choices} aria-label="Things you can do">{guide.choices.map((choice, index) => { const Icon = index === 0 ? Search : index === 1 ? Lightbulb : Sparkles; return <button type="button" key={choice.id} className={guided.choice} disabled={busy} onClick={() => choose(choice)}><span className={guided.choiceIcon}><Icon size={24} strokeWidth={1.7} /></span><span className={guided.choiceLabel}>{choice.label}<ArrowRight size={20} /></span><span className={guided.choiceDetail}>{choice.detail}</span></button>; })}</div>
    </> : <div className={guided.guideLoading} aria-live="polite">{busy ? <><Loader2 size={25} className={styles.spinner} /><h1>Finding your next move…</h1><p>I’m looking at what you saved.</p></> : <><h1>Your content is saved.</h1><button type="button" className={styles.secondaryButton} onClick={() => void loadGuide()}>Find three things to try<ArrowRight size={17} /></button></>}</div>}
    <div ref={chat} className={guided.chatSection} role="region" aria-label="Chat with your content">
      <div className={guided.chatToolbar}><span><MessageCircle size={17} /> Ask anything</span>{conversation.messages.length > 0 && <button type="button" className={styles.textButton} aria-expanded={chatOpen && historyOpen} onClick={() => { const show = !(chatOpen && historyOpen); setChatOpen(show); setHistoryOpen(show); }}>{chatOpen && historyOpen ? "Hide chat" : "Previous chat"}</button>}</div>
      {chatOpen && <div className={guided.chatMessages} aria-live="polite" aria-busy={busy}>{(pending && !historyOpen ? [] : historyOpen ? conversation.messages : conversation.messages.slice(-2)).map(renderMessage)}{pending && <article className={guided.question}><p className={guided.speaker}>You</p><p>{pending}</p></article>}{busy && pending && <p className={guided.thinking} role="status"><Loader2 size={18} className={styles.spinner} />Looking into it…</p>}</div>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {workflowNotice && <p role="status" className={styles.evidenceNote}>{workflowNotice}</p>}
      <form onSubmit={event => { event.preventDefault(); void send(input.trim()); }} className={guided.composer}>
        <textarea ref={composer} aria-label="Ask about your content" rows={1} maxLength={4000} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(input.trim()); } }} placeholder="Or ask a question…" />
        <button aria-label="Send message" disabled={busy || !input.trim()} className={guided.send}><ArrowUp size={22} /></button>
      </form>
      <p className={guided.promise}>You choose. I ask before I act.</p>
    </div>
    {action && <StudioDialog title={action.kind === "open_url" ? "Open this page?" : action.label} onClose={() => setAction(null)}>
      {action.kind === "open_url" && publicLink(action.url) ? <div className={guided.confirm}><p>I’ll open this page in a new tab.</p><a href={action.url!} className={guided.destination} target="_blank" rel="noreferrer">{new URL(action.url!).hostname}<span>{new URL(action.url!).pathname}</span></a><div className={guided.confirmButtons}><button type="button" className={styles.secondaryButton} onClick={() => setAction(null)}>Go back</button><a href={action.url!} target="_blank" rel="noreferrer" className={styles.primaryButton} onClick={() => setAction(null)}>Yes, open it<ArrowUpRight size={18} /></a></div></div> : <ReplicationPanel compact onRunStarted={() => setAction(null)} key={action.id} analysis={analysis} contextSourceIds={action.contextSourceIds} initialPlan={!action.contextSourceIds?.length && !savedPlan?.evidence.some(item => item.id.startsWith("source2-")) && savedPlan?.goal === action.goal && savedPlan?.mode === action.mode ? savedPlan : undefined} initialGoal={action.goal ?? ""} initialMode={action.mode} initialHarness={action.harness ?? "codex"} planningEndpoint="/api/local/replicate" initialExecutor={action.executor ?? (action.mode === "research" ? "browser" : "terminal")} initialPairingToken={pairingToken} />}
    </StudioDialog>}
    {sourceOpen && <StudioDialog title="What I read" onClose={() => setSourceOpen(false)}>
      <h3 className={guided.sourceTitle}>{title}</h3>{guide && <p className={styles.dialogDescription}>{guide.summary}</p>}
      {previewIndex >= 0 ? <button type="button" className={styles.sourcePreview} onClick={() => setFrame(previewIndex)}><Image unoptimized src={imageUrl(previewIndex)} width={1280} height={720} alt="Captured image from this source" /></button> : null}
      <p className={styles.evidenceText}>{observations.length ? `${observations.length} visual observations${analysis.transcript ? " and the audio transcript" : ""}. Small or brief details may be missed. Ask me to look closer at a moment.` : "The readable text from this source."}</p>
      <div className={styles.sourceMoments}>{(guide?.evidence ?? []).map(index => <button type="button" key={index} className={styles.evidenceButton} onClick={() => setFrame(index)}><Clock3 size={14} />{time(observations[index]?.timestampSec ?? 0)}</button>)}</div>
      {!!sourceEvidence?.warnings?.length && <p className={styles.evidenceNote}>{sourceEvidence.warnings.join(" ")}</p>}
      {sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer" className={styles.sourceLink}>Open original<ArrowUpRight size={15} /></a>}
    </StudioDialog>}
    {selectedObservation && frame !== null && <StudioDialog title={`In your content · ${time(selectedObservation.timestampSec ?? 0)}`} wide onClose={() => setFrame(null)}>{capturedFrameIndex(analysis, frame) !== null && <Image unoptimized src={imageUrl(frame)} width={1280} height={720} style={{ height: "auto" }} alt={`Captured source at ${time(selectedObservation.timestampSec ?? 0)}`} className={styles.evidenceImage} />}<p className={styles.evidenceText}>{selectedObservation.description}</p>{!!selectedObservation.onScreenText?.length && <p className={styles.evidenceNote}>On screen: {selectedObservation.onScreenText.join(" · ")}</p>}<p className={styles.evidenceNote}>{selectedObservation.uncertain ? "This detail was hard to read. Check the original." : "Read by AI. Check the original when exact wording matters."}</p>{originalMoment && <a href={originalMoment} target="_blank" rel="noreferrer" className={styles.sourceLink}>Open the original<ArrowUpRight size={15} /></a>}</StudioDialog>}
  </section>;
}
