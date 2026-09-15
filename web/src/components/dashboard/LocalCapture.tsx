"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FileUp, Link2, Loader2, Upload, X } from "lucide-react";
import { captureStageLabel } from "@/lib/capture-feedback";
import { publicLink } from "@/lib/content-conversation";
import styles from "./studio.module.css";
import guided from "./guided.module.css";

type Progress = { completedSegments: number; totalSegments: number; startSec?: number; endSec?: number };
const uploadTypes = ".mp4,.mov,.webm,.mp3,.m4a,.wav,.ogg,.png,.jpg,.jpeg,.webp,.pdf,.txt,.md,.csv,.json";
function fileLimit(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const megabytes = ["txt", "md", "csv", "json"].includes(extension) ? 1 : ["png", "jpg", "jpeg", "webp", "pdf"].includes(extension) ? 20 : 200;
  if (!uploadTypes.split(",").includes(`.${extension}`)) return "Choose a supported video, audio, image, PDF, or text file.";
  return file.size > megabytes * 1024 * 1024 ? `This file is too large. Choose a file under ${megabytes} MB.` : null;
}

export default function LocalCapture({ initialUrl = "", initialStatus = "empty", initialError = "", compact = false, geminiAvailable = false }: { initialUrl?: string; initialStatus?: string; initialError?: string; compact?: boolean; geminiAvailable?: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState(initialStatus === "done" ? "" : initialUrl.startsWith("https:") ? initialUrl : "");
  const [status, setStatus] = useState(initialStatus);
  const [stage, setStage] = useState("");
  const [error, setError] = useState(initialError);
  const [connectionIssue, setConnectionIssue] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [provider, setProvider] = useState("auto");
  const [mode, setMode] = useState<"link" | "file">("link");
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [inboxId, setInboxId] = useState<string | null>(null);
  const linkInput = useRef<HTMLInputElement>(null);
  const active = !["empty", "done", "failed"].includes(status);
  useEffect(() => {
    function receive(event: Event) {
      const value = (event as CustomEvent<{ id?: string; url?: string }>).detail;
      if (active || submitting || !value || typeof value.id !== "string" || !publicLink(value.url)) return;
      event.preventDefault();
      setUrl(value.url!); setInboxId(value.id); setMode("link"); setError("");
      setProvider("auto"); setQuestion(""); setFile(null);
      requestAnimationFrame(() => linkInput.current?.focus());
    }
    window.addEventListener("contextdrop:inbox-link", receive);
    return () => window.removeEventListener("contextdrop:inbox-link", receive);
  }, [active, submitting]);
  useEffect(() => {
    if (!active || submitting) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function check() {
      let finished = false;
      try {
        const response = await fetch("/api/local/capture", { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]), cache: "no-store" });
        if (controller.signal.aborted) return;
        if (!response.ok) { setConnectionIssue(true); return; }
        const data = await response.json();
        if (controller.signal.aborted) return;
        setConnectionIssue(false);
        if (data.status !== "empty") { setStatus(data.status); setStage(data.stage ?? data.status); setError(data.error?.message ?? ""); setProgress(data.progress ?? null); }
        finished = data.status === "done" || data.status === "failed";
        if (data.status === "done") { setUrl(""); setQuestion(""); setProvider("auto"); setFile(null); setMode("link"); }
        if (finished) router.refresh();
      } catch { if (!controller.signal.aborted) setConnectionIssue(true); }
      finally { if (!controller.signal.aborted && !finished) timer = setTimeout(check, 3_000); }
    }
    void check();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [active, submitting, router]);
  async function capture(event: React.FormEvent) {
    event.preventDefault();
    if (mode === "file" && !file) { setError("Choose a file to read first."); return; }
    if (file && mode === "file") { const issue = fileLimit(file); if (issue) { setError(issue); return; } }
    setError(""); setSubmitting(true); setStatus("starting"); setStage("starting"); setProgress(null);
    try {
      const response = mode === "file" && file
        ? await fetch("/api/local/upload", { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream", "X-ContextDrop-Filename": encodeURIComponent(file.name), ...(question.trim() ? { "X-ContextDrop-Question": encodeURIComponent(question.trim()) } : {}) }, body: file })
        : await fetch("/api/local/capture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url.trim(), provider, ...(question.trim() ? { question: question.trim() } : {}) }) });
      const data = await response.json();
      if (response.status === 409 && ["scraping", "transcribing", "analyzing"].includes(data.status)) {
        setStatus(data.status); setStage(data.stage ?? data.status); setError("");
        if (typeof data.sourceUrl === "string" && data.sourceUrl.startsWith("https:")) setUrl(data.sourceUrl);
        router.refresh(); return;
      }
      if (!response.ok) throw new Error(data.error ?? "Reading could not start.");
      if (inboxId && mode === "link") {
        // A received link stays in the inbox until capture was actually accepted.
        // A failed dismissal is harmless: preserve it for an explicit later retry.
        await fetch("/api/local/inbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "dismiss", id: inboxId }), signal: AbortSignal.timeout(3000) }).catch(() => {});
      }
      router.refresh();
    } catch (e) { setStatus("failed"); setError(e instanceof Error ? e.message : "Reading could not start. Your previous conversations are still saved."); }
    finally { setSubmitting(false); }
  }
  const completed = Math.max(0, Number(progress?.completedSegments) || 0);
  const total = Math.max(0, Number(progress?.totalSegments) || 0);
  return <section aria-label="Add content" className={guided.ingest} data-compact={compact}>
    <form onSubmit={capture}>
      {mode === "link" ? <div className={guided.linkBar}>
        <Link2 size={22} aria-hidden="true" />
        <label htmlFor="local-source-url" className={styles.visuallyHidden}>Content link</label>
        <input ref={linkInput} id="local-source-url" type="url" required disabled={active} value={url} onChange={event => { setUrl(event.target.value); setInboxId(null); }} placeholder="Paste a link…" autoComplete="off" />
        <button type="button" className={guided.uploadButton} aria-label="Upload a file" title="Upload a file" disabled={active} onClick={() => { setMode("file"); setError(""); }}><Upload size={19} /></button>
        <button aria-label="Read this link" disabled={active || !url.trim()} className={guided.readButton}>{active ? <Loader2 size={20} className={styles.spinner} /> : <><span>Read</span><ArrowRight size={20} /></>}</button>
      </div> : <div className={guided.fileBox}>
        <button type="button" aria-label="Back to paste a link" disabled={active} className={styles.iconButton} onClick={() => setMode("link")}><X size={18} /></button>
        <FileUp size={28} /><strong>{file ? file.name : "Choose something to read"}</strong><p>Video, audio, image, PDF or text.</p>
        <label className={styles.secondaryButton}>{file ? "Change file" : "Choose file"}<input className={styles.fileInput} aria-label="Choose content file" type="file" accept={uploadTypes} disabled={active} onChange={event => { const selected = event.target.files?.[0] ?? null; setFile(selected); setError(selected ? fileLimit(selected) ?? "" : ""); }} /></label>
        {file && <button disabled={active || !!fileLimit(file)} className={styles.primaryButton}>{active ? <Loader2 size={18} className={styles.spinner} /> : <ArrowRight size={18} />}{active ? "Reading…" : "Read this file"}</button>}
        <small>Sent to your AI provider. Media: 200 MB / 60 min. Images & PDFs: 20 MB. Text: 1 MB.</small>
      </div>}
      {url.trim() && !active && <details className={guided.readOptions}><summary>Reading options</summary><div className={styles.captureOptionsContent}>
        <label className={styles.field}>Look for something specific<input className={styles.input} value={question} maxLength={2000} onChange={event => setQuestion(event.target.value)} placeholder="Optional — like the repo on screen" /></label>
        {mode === "link" && <label className={styles.field}>Video reader<select aria-label="Content reader" value={provider} onChange={event => setProvider(event.target.value)} className={styles.select}><option value="auto">Choose for me</option><option value="detailed">Closer look · up to 10 min</option><option value="gemini" disabled={!geminiAvailable}>Gemini{geminiAvailable ? "" : " · needs a key"}</option><option value="openai">Other reader (OpenAI)</option></select></label>}
      </div><p>{geminiAvailable ? "YouTube: up to 60 minutes. Other social videos: up to 10 minutes." : "Social videos: up to 10 minutes. Add Gemini for longer YouTube videos."} If a link is blocked, upload the file.</p></details>}
    </form>
    {active && <div role="status" className={guided.reading}><Loader2 size={20} className={styles.spinner} /><div><strong>{submitting && mode === "file" ? "Uploading your file…" : captureStageLabel(stage || status)}</strong><p>{connectionIssue ? "Reconnecting. Your reading may still be running." : total > 0 ? `${completed} of ${total} parts read.` : "Your choices will appear here when it’s ready."}</p>{total > 0 && <progress max={total} value={completed} aria-label="Reading progress" />}</div></div>}
    {error && <div role="alert" className={styles.error}><strong>Couldn’t read this yet.</strong><p>{error}</p>{status === "failed" && <button type="button" className={styles.textButton} onClick={() => setMode("file")}>Upload the file instead</button>}</div>}
  </section>;
}
