"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { captureStageLabel } from "@/lib/capture-feedback";

export default function LocalCapture({ initialUrl = "", initialStatus = "empty", initialError = "", compact = false, geminiAvailable = false }: { initialUrl?: string; initialStatus?: string; initialError?: string; compact?: boolean; geminiAvailable?: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [status, setStatus] = useState(initialStatus);
  const [stage, setStage] = useState("");
  const [error, setError] = useState(initialError);
  const [submitting, setSubmitting] = useState(false);
  const [provider, setProvider] = useState("auto");
  const [expanded, setExpanded] = useState(!compact);
  const active = !["empty", "done", "failed"].includes(status);
  useEffect(() => {
    // Do not poll the previous capture while the POST is still starting its replacement.
    if (!active || submitting) return;
    const controller = new AbortController();
    const timer = setInterval(async () => {
      try {
        const response = await fetch("/api/local/capture", { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        if (data.status !== "empty") { setStatus(data.status); setStage(data.stage ?? data.status); setError(data.error?.message ?? ""); }
        if (data.status === "done" || data.status === "failed") router.refresh();
      } catch { /* reconnect next poll; never fabricate success */ }
    }, 2_000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [active, submitting, router]);
  async function capture(event: React.FormEvent) {
    event.preventDefault(); setError(""); setSubmitting(true); setStatus("starting"); setStage("starting");
    try {
      const response = await fetch("/api/local/capture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, provider }) });
      const data = await response.json();
      if (response.status === 409 && ["scraping", "transcribing", "analyzing"].includes(data.status)) {
        setStatus(data.status); setStage(data.stage ?? data.status); setError("");
        if (typeof data.sourceUrl === "string") setUrl(data.sourceUrl);
        router.refresh(); return;
      }
      if (!response.ok) throw new Error(data.error ?? "Capture could not start.");
      router.refresh();
    } catch (e) { setStatus("failed"); setError(e instanceof Error ? e.message : "Capture failed."); }
    finally { setSubmitting(false); }
  }
  return <section className="mb-7 rounded-2xl border border-white/10 bg-[#141210] p-4 sm:p-5">
    {compact && !expanded && !active ? <button onClick={() => setExpanded(true)} className="flex w-full items-center justify-between gap-4 text-sm text-stone-400"><span className="truncate">Drop another link…</span><ArrowRight size={17} className="text-orange-400" /></button> : <>
    <form onSubmit={capture}><label htmlFor="local-source-url" className="mb-3 block text-xs font-medium text-stone-400">{compact ? "Analyze another piece of content" : "Start with a public link"}</label><div className="flex flex-col gap-3 sm:flex-row"><input id="local-source-url" type="url" required disabled={active} value={url} onChange={e => setUrl(e.target.value)} placeholder="YouTube, Instagram, X, a GitHub repo, a website…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0b0a09] px-4 py-3.5 text-sm text-stone-100 outline-none focus:border-orange-500 placeholder:text-stone-600" /><button disabled={active} className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:opacity-60">{active ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}{active ? "Reading content…" : "Analyze this link"}</button></div></form>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="max-w-2xl text-[11px] leading-relaxed text-stone-500">{geminiAvailable ? "YouTube up to 60 minutes with Gemini. Other social videos up to 10 minutes. Public pages and repos supported." : "Public social videos up to 10 minutes. Public pages and repos supported. Connect Gemini for longer YouTube videos."} Platform access can limit retrieval.</p><label className="flex items-center gap-2 text-[11px] text-stone-500">Reader<select aria-label="Content reader" disabled={active} value={provider} onChange={event => setProvider(event.target.value)} className="rounded-md border border-white/10 bg-[#141210] px-2 py-1.5 text-stone-300"><option value="auto">Automatic</option><option value="detailed">Saved video frames</option><option value="gemini" disabled={!geminiAvailable}>Gemini video{geminiAvailable ? "" : " · key needed"}</option></select></label></div>
    </>}
    {active && <p role="status" className="mt-4 rounded-xl bg-orange-500/10 p-3 text-xs text-orange-200">{captureStageLabel(stage || status)}. This page updates automatically.</p>}
    {status === "failed" && <div role="alert" className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200"><p className="font-semibold">Capture stopped</p><p className="mt-1">{error || "Content capture stopped before analysis could finish. Try again or choose another public link. No task was started."}</p></div>}
  </section>;
}
