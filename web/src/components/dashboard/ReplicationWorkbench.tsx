"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Film, Layers3, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ReplicationPanel from "./ReplicationPanel";
import type { Analysis } from "@/lib/types";
import type { ReplicationPlan } from "@/lib/execution-plan";
import { parseVerdict } from "@/lib/verdict-parser";

export default function ReplicationWorkbench({ demoAnalysis, demoPlan }: { demoAnalysis?: Analysis; demoPlan?: ReplicationPlan }) {
  const params = useSearchParams();
  const analysisId = params.get("analysis");
  const [analysis, setAnalysis] = useState<Analysis | null>(demoAnalysis ?? null);
  const [saved, setSaved] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(!demoAnalysis);
  const [error, setError] = useState("");
  const [signedOut, setSignedOut] = useState(false);
  useEffect(() => {
    if (demoAnalysis) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(analysisId ? `/api/analyses/${encodeURIComponent(analysisId)}` : "/api/analyses?limit=20", { signal: controller.signal });
        if (response.status === 401) { setSignedOut(true); return; }
        if (!response.ok) throw new Error("This source could not be loaded. Return to your library and choose a completed analysis.");
        const data = await response.json();
        if (analysisId) setAnalysis(data); else setSaved(data.analyses ?? []);
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Could not load your sources."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [analysisId, demoAnalysis]);

  return <main className="min-h-screen bg-[#f7f8fb] text-slate-900">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8"><Link href="/dashboard" className="flex items-center gap-2 text-sm font-bold tracking-tight"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white"><Layers3 size={16} /></span>ContextDrop</Link><Link href="/dashboard" className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-700"><ArrowLeft size={13} />Back to library</Link></div></header>
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-11"><div className="mb-7"><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">The execution workbench</p><h1 className="text-3xl font-semibold tracking-tight sm:text-[38px]">You saved it. Now make it happen.</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">Turn what you found into a useful result. Understand the source, choose your outcome, and bring a reviewed plan into your workspace.</p></div>
      {loading ? <div role="status" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500"><Loader2 size={17} className="animate-spin" />Loading your source…</div> : signedOut ? <div className="rounded-2xl border border-slate-200 bg-white p-8"><h2 className="text-lg">Your sources stay in your account.</h2><p className="my-3 text-sm text-slate-500">Sign in to choose a completed analysis and prepare a plan.</p><Link href="/login" className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Sign in</Link></div> : error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p> : analysis ? <ReplicationPanel key={analysis.id} analysis={analysis} initialPlan={demoPlan} demo={!!demoAnalysis} /> : <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="mb-4 text-lg">Choose something from your library</h2>{saved.length ? <ul className="divide-y divide-slate-100">{saved.map((item) => <li key={item.id}><Link href={`/replicate?analysis=${item.id}`} className="flex items-center gap-3 py-4 hover:text-blue-700"><Film size={18} className="shrink-0 text-slate-400" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.verdict ? parseVerdict(item.verdict).title : item.caption?.slice(0, 100) || "Saved source"}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">{item.platform}</p></div><ArrowUpRight size={15} /></Link></li>)}</ul> : <p className="text-sm text-slate-500">Your completed analyses will appear here. <Link className="font-medium text-blue-700" href="/dashboard">Analyze your first link.</Link></p>}</section>}
    </div>
  </main>;
}
