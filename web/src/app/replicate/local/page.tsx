import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Check, ArrowUpRight, ScanSearch, Lightbulb, WandSparkles } from "lucide-react";
import LocalCapture from "@/components/dashboard/LocalCapture";
import ContentStudio from "@/components/dashboard/ContentStudio";
import LocalLibrary from "@/components/dashboard/LocalLibrary";
import WorkspaceTools from "@/components/dashboard/WorkspaceTools";
import styles from "@/components/dashboard/studio.module.css";
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
  return <main className={styles.studio}>
    <div className={styles.shell}>
      <header className={styles.nav}><Link href="/replicate/local" className={styles.brand}><span className={styles.brandMark}><Check size={19} strokeWidth={2.75} /></span>ContextDrop</Link><nav aria-label="Workspace" className={styles.navActions}><LocalLibrary currentId={capture?.id} /><WorkspaceTools canUseWorkflow={!!analysis} /><span className={styles.localBadge}>On your Mac</span></nav></header>
      {analysis ? <div className={styles.workspaceIntro}><h1>Your workspace</h1><p>From something interesting to something useful.</p></div> : <div className={styles.hero}><p className={styles.eyebrow}>Keep the idea. Do something with it.</p><h1>Your feed.<br />Finally useful.</h1><p>Bring a video, a page, or a file. Find what matters, ask anything, and make it your own.</p></div>}
      <LocalCapture key={`capture-${capture?.id ?? "empty"}`} initialUrl={capture?.source_url} initialStatus={capture?.status} initialError={getCaptureFailure(capture)?.message} compact={!!analysis} geminiAvailable={!!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)} />
      {result && <div className={`${styles.success} ${styles.inline}`} style={{ marginBottom: "1rem", justifyContent: "space-between" }}><p>A previous run from this source has an independently checked result.</p><a href={result.url} target="_blank" rel="noreferrer" className={styles.inline}>Open {result.title}<ArrowUpRight size={14} /></a></div>}
      {analysis ? <ContentStudio key={`content-${analysis.id}`} analysis={analysis} pairingToken={pairingToken} savedPlan={savedPlan} /> : <div className={styles.examples}>{[{ title: "Find what’s on screen", example: "“Find the GitHub repo he briefly showed.”", icon: ScanSearch }, { title: "Understand the idea", example: "“Explain this and tell me where it could help.”", icon: Lightbulb }, { title: "Make your version", example: "“Help me try this with my own project.”", icon: WandSparkles }].map(({ title, example, icon: Icon }) => <div key={title} className={styles.example}><Icon size={21} strokeWidth={1.6} /><h2>{title}</h2><p>{example}</p></div>)}</div>}
    </div>
  </main>;
}
