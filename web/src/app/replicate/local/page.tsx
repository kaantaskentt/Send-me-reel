import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import ReplicationPanel from "@/components/dashboard/ReplicationPanel";
import LocalCapture from "@/components/dashboard/LocalCapture";
import { isLocalStudioRequest, readLocalAnalysis, readLocalPlan, readLocalCompanionToken, readLocalResult } from "@/lib/local-studio";

export const dynamic = "force-dynamic";
export const metadata = { title: "Local video studio | ContextDrop" };

export default async function LocalStudioPage() {
  const requestHeaders = await headers();
  if (!isLocalStudioRequest(requestHeaders)) notFound();
  const pairingToken = await readLocalCompanionToken(requestHeaders.get("host") ?? "");
  const capture = await readLocalAnalysis(true);
  const analysis = capture?.status === "done" ? capture : null;
  const plan = analysis ? await readLocalPlan(analysis) : undefined;
  const result = analysis ? await readLocalResult(analysis.id) : null;
  const observations = (analysis?.frame_descriptions ?? []) as { timestampSec?: number; uncertain?: boolean }[];
  const duration = Number(analysis?.metadata?.duration ?? 0);
  const times = observations.map(f => f.timestampSec).filter((t): t is number => typeof t === "number");
  const last = times.length ? Math.max(...times) : 0;
  const local = analysis?.metadata?.local_evidence as { framePaths?: string[]; timestampsSec?: number[] } | undefined;
  const frameCount = local?.framePaths?.length ?? 0;
  const sampleIndexes = frameCount ? [...new Set([0, Math.round((frameCount - 1) * .2), Math.round((frameCount - 1) * .4), Math.round((frameCount - 1) * .65)])] : [];
  return <main className="min-h-screen bg-[#f7f8fb] px-5 py-7 text-slate-900 sm:px-8">
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3"><Link href="/replicate/local" className="text-xl font-bold tracking-tight">ContextDrop<span className="text-blue-600">.</span></Link><div className="flex gap-4 text-xs"><Link href="/replicate/demo" className="text-slate-500 underline">Rehearsal</Link><span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-800">Local studio · real provider calls</span></div></header>
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">From saved content to something you can do</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Watch it. Understand it. Make it happen.</h1>
      <p className="mb-8 mt-4 max-w-3xl text-sm leading-relaxed text-slate-500">This local studio uses the captured audio and screen evidence from a real source. Plans require review. Browser actions run only after pairing your Mac companion.</p>
      <LocalCapture initialUrl={capture?.source_url} initialStatus={capture?.status} />
      {result && <section className="mb-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-7"><p className="text-[10px] font-bold uppercase tracking-widest text-emerald-800">Created from this source · independently checked example</p><div className="mt-3 flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">{result.title}</h2><p className="mt-2 max-w-2xl text-xs leading-relaxed text-emerald-900">{result.checks.join(" · ")}</p></div><a href={result.url} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white">Play the recreated game ↗</a></div><p className="mt-3 text-[10px] text-emerald-800">This specific build was checked at {new Date(result.verifiedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC. A new run creates a new result that needs its own checks.</p></section>}
      {!analysis ? <section className="rounded-2xl border border-blue-200 bg-white p-7"><h2 className="text-xl font-semibold">Waiting for real source capture</h2><p className="mt-3 text-sm text-slate-500">The capture process is retrieving the video, transcribing its audio, and inspecting timestamped screen frames. Reload after capture finishes.</p><a href="/replicate/local" className="mt-5 inline-block rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">Refresh capture</a></section> : <>
        <section aria-label="Capture evidence" className="mb-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">What the AI actually saw</h2><span className="text-xs font-semibold text-emerald-700">Captured from the source · {new Date(analysis.completed_at ?? analysis.created_at).toLocaleDateString("en-GB")}</span></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Source duration", `${Math.floor(duration / 60)}m ${Math.round(duration % 60)}s`], ["Audio transcript", analysis.transcript ? `${analysis.transcript.trim().split(/\s+/).length.toLocaleString()} words` : "Not captured"], ["Screen observations", `${observations.length} sampled frames`], ["Last observed frame", `${Math.floor(last / 60)}:${Math.floor(last % 60).toString().padStart(2,"0")}`]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-sm font-semibold">{value}</p></div>)}</div>
          {sampleIndexes.length > 0 && <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{sampleIndexes.map(i => <a key={i} href={`/api/local/frames/${i}`} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border border-slate-200"><img src={`/api/local/frames/${i}`} alt={`Actual source video frame at ${Math.round(local?.timestampsSec?.[i] ?? 0)} seconds`} className="aspect-video w-full object-contain bg-slate-950" /><p className="p-2 text-xs text-slate-500">Source frame · {Math.round(local?.timestampsSec?.[i] ?? 0)}s</p></a>)}</div>}
          <p className="mt-4 text-xs leading-relaxed text-slate-500">Audio becomes a transcript. Sampled images become screen observations. These are combined into a source-linked plan. Sampling can miss fast steps; unreadable details stay uncertain. “Prepared” means ready for your review, not that the result has already been built.</p>
        </section>
        <ReplicationPanel analysis={analysis} initialPlan={plan} planningEndpoint="/api/local/replicate" initialExecutor="browser" initialPairingToken={pairingToken} planningNotice="Local mode uses your configured provider key. 20 planning attempts per UTC day. No production database or credits are changed." />
      </>}
    </div>
  </main>;
}
