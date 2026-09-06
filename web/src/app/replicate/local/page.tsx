import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Check, ArrowUpRight } from "lucide-react";
import LocalCapture from "@/components/dashboard/LocalCapture";
import ContentStudio from "@/components/dashboard/ContentStudio";
import LocalLibrary from "@/components/dashboard/LocalLibrary";
import { getCaptureFailure } from "@/lib/capture-feedback";
import { isLocalStudioRequest, readLocalAnalysis, readLocalCompanionToken, readLocalResult, readLocalPlan } from "@/lib/local-studio";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your content, made useful | ContextDrop" };

export default async function LocalStudioPage() {
  const requestHeaders = await headers();
  if (!isLocalStudioRequest(requestHeaders)) notFound();
  const [pairingToken, capture] = await Promise.all([readLocalCompanionToken(requestHeaders.get("host") ?? ""), readLocalAnalysis(true)]);
  const analysis = capture?.status === "done" ? capture : null;
  const [result, savedPlan] = analysis ? await Promise.all([readLocalResult(analysis.id), readLocalPlan(analysis)]) : [null, undefined];
  return <main className="min-h-screen bg-[#0b0a09] px-4 pb-20 pt-6 text-stone-100 sm:px-8" style={{ backgroundImage: "radial-gradient(ellipse at 30% 0%, rgba(249,115,22,.07), transparent 50%)" }}>
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4"><Link href="/replicate/local" className="flex items-center gap-2.5 text-lg font-bold tracking-tight"><span className="rounded-xl bg-orange-500 p-1.5"><Check size={20} strokeWidth={3} /></span>ContextDrop</Link><div className="flex flex-wrap items-center gap-4 text-xs"><LocalLibrary currentId={capture?.id} /><Link href="/replicate/demo" className="text-stone-500 transition hover:text-stone-200">Rehearsal</Link><span className="rounded-full border border-orange-500/20 bg-orange-500/5 px-3 py-1.5 text-orange-300">Your Mac · local preview</span></div></header>
      <div className={analysis ? "mb-7" : "mx-auto mb-8 max-w-2xl pt-6 text-center sm:pt-12"}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[.18em] text-orange-400">For the AI things you want to actually try</p>
        <h1 className={analysis ? "text-3xl font-semibold tracking-tight sm:text-4xl" : "text-5xl font-semibold leading-[1.1] tracking-tight sm:text-6xl"}>{analysis ? "Saved it. Now make it useful." : <>Your feed.<br /><span className="text-orange-400">Finally useful.</span></>}</h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-400">{analysis ? "Ask about the idea, find the tools, or make your own version. You choose what happens next." : "Drop a video, a repo, or a website. Understand what matters. Then do something with it."}</p>
      </div>
      <LocalCapture key={`capture-${capture?.id ?? "empty"}`} initialUrl={capture?.source_url} initialStatus={capture?.status} initialError={getCaptureFailure(capture)?.message} compact={!!analysis} geminiAvailable={!!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)} />
      {result && <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"><p className="text-xs text-emerald-200">A previous run from this source has an independently checked result.</p><a href={result.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">Open {result.title}<ArrowUpRight size={14} /></a></div>}
      {analysis ? <ContentStudio key={`content-${analysis.id}`} analysis={analysis} pairingToken={pairingToken} savedPlan={savedPlan} /> : <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">{[["Spot a repo", "“Find the GitHub repo on his screen.”"], ["Understand a skill", "“What does this do, and would I use it?”"], ["Make your version", "“Help me try this with my project.”"]].map(([title, example]) => <div key={title} className="rounded-xl border border-white/5 bg-white/[.02] p-5"><p className="text-xs font-semibold text-stone-200">{title}</p><p className="mt-2 text-xs leading-relaxed text-stone-500">{example}</p></div>)}</div>}
    </div>
  </main>;
}
