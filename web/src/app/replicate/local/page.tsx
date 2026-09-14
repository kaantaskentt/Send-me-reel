import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Check, ScanSearch, Lightbulb, WandSparkles, MoreHorizontal } from "lucide-react";
import LocalCapture from "@/components/dashboard/LocalCapture";
import ContentStudio from "@/components/dashboard/ContentStudio";
import LocalLibrary from "@/components/dashboard/LocalLibrary";
import guided from "@/components/dashboard/guided.module.css";
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
  return <main className={`${styles.studio} ${guided.app}`}>
    <header className={guided.nav}>
      <Link href="/replicate/local" className={styles.brand}><span className={styles.brandMark}><Check size={21} strokeWidth={2.5} /></span>ContextDrop</Link>
      <nav aria-label="Workspace" className={guided.navActions}>
        <LocalLibrary currentId={capture?.id} /><PhoneInbox /><LocalTasks token={pairingToken} />
        <span className={guided.connection}><LocalRuntimeStatus /></span>
        <details className={guided.more}><summary aria-label="More options"><MoreHorizontal size={20} /></summary><div><WorkspaceTools canUseWorkflow={!!analysis} /></div></details>
      </nav>
    </header>
    <div className={guided.main}>
      {!analysis && <div className={guided.emptyHero}><h1>Saved it? Try it.</h1><p>Drop a link. Find out what you can do with it.</p></div>}
      <LocalCapture key={`capture-${capture?.id ?? "empty"}`} initialUrl={capture?.source_url} initialStatus={capture?.status} initialError={getCaptureFailure(capture)?.message} compact={!!analysis} geminiAvailable={!!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)} />
      {analysis ? <ContentStudio key={`content-${analysis.id}`} analysis={analysis} pairingToken={pairingToken} savedPlan={savedPlan} /> : <div className={guided.emptyExamples}>{[{ title: "Find the tool", detail: "Even when it only appears on screen.", icon: ScanSearch }, { title: "Get the idea", detail: "Ask anything about what you saved.", icon: Lightbulb }, { title: "Try it yourself", detail: "Choose a task. Watch it happen.", icon: WandSparkles }].map(({ title, detail, icon: Icon }) => <div key={title}><Icon size={23} strokeWidth={1.6} /><h2>{title}</h2><p>{detail}</p></div>)}</div>}
    </div>
  </main>;
}
