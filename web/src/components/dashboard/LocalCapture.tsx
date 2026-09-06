"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { captureStageLabel } from "@/lib/capture-feedback";

export default function LocalCapture({ initialUrl = "", initialStatus = "empty", initialError = "" }: { initialUrl?: string; initialStatus?: string; initialError?: string }) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [status, setStatus] = useState(initialStatus);
  const [stage, setStage] = useState("");
  const [error, setError] = useState(initialError);
  const [submitting, setSubmitting] = useState(false);
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
      const response = await fetch("/api/local/capture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
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
  return <section className="mb-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
    <form onSubmit={capture}><label htmlFor="local-source-url" className="mb-3 block text-sm font-semibold">Drop a video. Turn it into your next project.</label><div className="flex flex-col gap-3 sm:flex-row"><input id="local-source-url" type="url" required disabled={active} value={url} onChange={e => setUrl(e.target.value)} placeholder="Paste a YouTube, Instagram, TikTok, or X link" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500" /><button disabled={active} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{active ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}{active ? "Analyzing video…" : "Analyze this link"}</button></div></form>
    <p className="mt-3 text-xs text-slate-500">Public videos up to 10 minutes. Retrieval depends on platform access. Analysis uses your provider account and may take several minutes.</p>
    {active && <p role="status" className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{captureStageLabel(stage || status)}. This page updates automatically.</p>}
    {status === "failed" && <div role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"><p className="font-semibold">Capture stopped</p><p className="mt-1">{error || "Video capture stopped before analysis could finish. Try again or choose another public video. No task was started."}</p></div>}
  </section>;
}
