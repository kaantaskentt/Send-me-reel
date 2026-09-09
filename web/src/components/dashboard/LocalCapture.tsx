"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FileUp, Link2, Loader2, Plus, Upload, X } from "lucide-react";
import { captureStageLabel } from "@/lib/capture-feedback";
import styles from "./studio.module.css";

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
  const [url, setUrl] = useState(initialUrl.startsWith("https:") ? initialUrl : "");
  const [status, setStatus] = useState(initialStatus);
  const [stage, setStage] = useState("");
  const [error, setError] = useState(initialError);
  const [connectionIssue, setConnectionIssue] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [provider, setProvider] = useState("auto");
  const [expanded, setExpanded] = useState(!compact);
  const [mode, setMode] = useState<"link" | "file">("link");
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [progress, setProgress] = useState<Progress | null>(null);
  const active = !["empty", "done", "failed"].includes(status);
  useEffect(() => {
    if (!active || submitting) return;
    const controller = new AbortController();
    const timer = setInterval(async () => {
      try {
        const response = await fetch("/api/local/capture", { signal: controller.signal, cache: "no-store" });
        if (!response.ok) { setConnectionIssue(true); return; }
        const data = await response.json(); setConnectionIssue(false);
        if (data.status !== "empty") { setStatus(data.status); setStage(data.stage ?? data.status); setError(data.error?.message ?? ""); setProgress(data.progress ?? null); }
        if (data.status === "done" || data.status === "failed") router.refresh();
      } catch { if (!controller.signal.aborted) setConnectionIssue(true); }
    }, 2_000);
    return () => { controller.abort(); clearInterval(timer); };
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
      router.refresh();
    } catch (e) { setStatus("failed"); setError(e instanceof Error ? e.message : "Reading could not start. Your previous conversations are still saved."); }
    finally { setSubmitting(false); }
  }
  const completed = Math.max(0, Number(progress?.completedSegments) || 0);
  const total = Math.max(0, Number(progress?.totalSegments) || 0);
  return <section aria-label="Add content" className={`${styles.capture} ${expanded || active ? styles.captureExpanded : ""}`}>
    {compact && !expanded && !active ? <button type="button" onClick={() => setExpanded(true)} className={styles.captureCompact}><Plus size={18} /><span>Add a link or upload a file</span><ArrowRight size={16} /></button> : <>
      <div className={styles.captureTabs}><button type="button" className={styles.tab} disabled={active} aria-pressed={mode === "link"} onClick={() => { setMode("link"); setError(""); }}><Link2 size={15} /> Paste a link</button><button type="button" className={styles.tab} disabled={active} aria-pressed={mode === "file"} onClick={() => { setMode("file"); setError(""); }}><Upload size={15} /> Upload a file</button>{compact && !active && <button type="button" aria-label="Close add content" className={`${styles.iconButton} ${styles.closeCapture}`} onClick={() => setExpanded(false)}><X size={17} /></button>}</div>
      <form onSubmit={capture}>
        {mode === "link" ? <div className={styles.captureRow}><label htmlFor="local-source-url" className={styles.visuallyHidden}>Content link</label><input id="local-source-url" type="url" required disabled={active} value={url} onChange={event => setUrl(event.target.value)} placeholder="YouTube, Instagram, a GitHub repo, a website…" className={styles.input} /><button disabled={active} className={styles.primaryButton}>{active ? <Loader2 size={16} className={styles.spinner} /> : <ArrowRight size={16} />}{active ? "Reading content…" : "Analyze this link"}</button></div> : <div className={styles.uploadZone}><FileUp size={25} /><strong>{file ? file.name : "Bring the content you want to understand"}</strong><p>Video, audio, image, PDF, or text</p><label className={styles.secondaryButton}>{file ? "Choose a different file" : "Choose file"}<input className={styles.fileInput} aria-label="Choose content file" type="file" accept={uploadTypes} disabled={active} onChange={event => { const selected = event.target.files?.[0] ?? null; setFile(selected); setError(selected ? fileLimit(selected) ?? "" : ""); }} /></label>{file && <button disabled={active || !!fileLimit(file)} className={styles.primaryButton}>{active ? <Loader2 size={16} className={styles.spinner} /> : <ArrowRight size={16} />}{active ? "Reading content…" : "Analyze this file"}</button>}</div>}
        <p className={styles.captureHint}>{mode === "file" ? "Media up to 200 MB / 60 minutes · Images and PDFs up to 20 MB · Text up to 1 MB. Files are sent to your configured AI provider for analysis." : geminiAvailable ? "Public links, videos up to 60 minutes, and readable web pages. If a platform blocks a link, upload your own copy." : "Public social videos up to 10 minutes, web pages, and repos. Connect Gemini for longer videos and visual file analysis."}</p>
        <details className={styles.captureOptions}><summary>Give it a focus or change the reader</summary><div className={styles.captureOptionsContent}><label className={styles.field}>What caught your attention? <span className={styles.visuallyHidden}>(optional)</span><input className={styles.input} value={question} maxLength={2000} disabled={active} onChange={event => setQuestion(event.target.value)} placeholder="Find the repo briefly shown on screen…" /></label>{mode === "link" && <label className={styles.field}>Reader<select aria-label="Content reader" disabled={active} value={provider} onChange={event => setProvider(event.target.value)} className={styles.select}><option value="auto">Automatic</option><option value="detailed">Saved video frames</option><option value="gemini" disabled={!geminiAvailable}>Gemini video{geminiAvailable ? "" : " · key needed"}</option></select></label>}</div></details>
      </form>
    </>}
    {active && <div role="status" className={styles.captureStatus}><Loader2 size={17} className={styles.spinner} /><div style={{ flex: 1 }}><strong>{submitting && mode === "file" ? "Uploading your file…" : captureStageLabel(stage || status)}</strong><p>{connectionIssue ? "Reconnecting to the reader. Your work may still be running." : total > 0 ? `${completed} of ${total} sections read. This page updates as each section finishes.` : "You can leave this open. Your conversation will appear when reading finishes."}</p>{total > 0 && <div className={styles.progress} aria-hidden="true">{Array.from({ length: Math.min(total, 24) }, (_, index) => <span key={index} data-complete={index < completed / total * Math.min(total, 24)} />)}</div>}</div></div>}
    {error && <div role="alert" className={styles.error}><strong>{status === "failed" ? "We couldn’t finish reading this source" : "Check your content"}</strong><p>{error}</p>{status === "failed" && <p>Your saved conversations are still in the Library. You can retry this source or upload a file.</p>}</div>}
  </section>;
}
