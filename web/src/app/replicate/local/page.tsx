import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Check, ScanSearch, Lightbulb, WandSparkles } from "lucide-react";
import LocalCapture from "@/components/dashboard/LocalCapture";
import ContentStudio from "@/components/dashboard/ContentStudio";
import PersonalSources from "@/components/dashboard/PersonalSources";
import WorkspaceTools from "@/components/dashboard/WorkspaceTools";
import LocalTasks from "@/components/dashboard/LocalTasks";
import LocalRuntimeStatus from "@/components/dashboard/LocalRuntimeStatus";
import PhoneInbox from "@/components/dashboard/PhoneInbox";
import styles from "@/components/dashboard/studio.module.css";
import { getCaptureFailure } from "@/lib/capture-feedback";
import { isLocalStudioRequest, readLocalAnalysis, readLocalCompanionToken, readLocalPlan } from "@/lib/local-studio";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your content, made useful | ContextDrop" };

export default async function LocalStudioPage() {
  const requestHeaders = await headers();
  if (!isLocalStudioRequest(requestHeaders)) notFound();
  const [pairingToken, capture] = await Promise.all([readLocalCompanionToken(requestHeaders.get("host") ?? ""), readLocalAnalysis(true)]);
  const analysis = capture?.status === "done" ? capture : null;
  const savedPlan = analysis ? await readLocalPlan(analysis) : undefined;
  return <main className={styles.studio}>
    <div className={styles.personalShell}>
      <aside className={styles.personalRail} aria-label="Your content library"><Link href="/replicate/local" className={styles.brand}><span className={styles.brandMark}><Check size={19} strokeWidth={2.75} /></span>ContextDrop</Link><PersonalSources currentId={capture?.id} /><div className={styles.railTools}><PhoneInbox /><WorkspaceTools canUseWorkflow={!!analysis} /></div></aside>
      <div className={styles.personalMain}>
      <header className={styles.personalNav}><h1>{analysis ? "Your workspace" : "Make something of it"}</h1><nav aria-label="Workspace" className={styles.navActions}><LocalTasks token={pairingToken} /><LocalRuntimeStatus /></nav></header>
      {!analysis && <div className={styles.hero}><h1>What caught your eye?</h1><p>Paste a link or upload the content. Ask about it, then choose what you want to do.</p></div>}
      <LocalCapture key={`capture-${capture?.id ?? "empty"}`} initialUrl={capture?.source_url} initialStatus={capture?.status} initialError={getCaptureFailure(capture)?.message} compact={!!analysis} geminiAvailable={!!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)} />
      {analysis ? <ContentStudio key={`content-${analysis.id}`} analysis={analysis} pairingToken={pairingToken} savedPlan={savedPlan} /> : <div className={styles.examples}>{[{ title: "Find what’s on screen", example: "“Find the GitHub repo he briefly showed.”", icon: ScanSearch }, { title: "Understand the idea", example: "“Explain this and tell me where it could help.”", icon: Lightbulb }, { title: "Make your version", example: "“Help me try this with my own project.”", icon: WandSparkles }].map(({ title, example, icon: Icon }) => <div key={title} className={styles.example}><Icon size={21} strokeWidth={1.6} /><h2>{title}</h2><p>{example}</p></div>)}</div>}
      </div>
    </div>
  </main>;
}
