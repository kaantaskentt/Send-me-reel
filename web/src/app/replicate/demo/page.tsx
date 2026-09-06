import { Suspense } from "react";
import { notFound } from "next/navigation";
import ReplicationWorkbench from "@/components/dashboard/ReplicationWorkbench";
import { buildSourceEvidence, parseReplicationPlan } from "@/lib/execution-plan";
import type { Analysis } from "@/lib/types";

export const metadata = { title: "Workbench demo | ContextDrop" };

export default function ReplicationDemoPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const analysis: Analysis = {
    id: "demo-website-tutorial", user_id: "demo", source_url: "https://example.com/illustrative-website-tutorial", platform: "youtube", status: "done",
    transcript: "First, create a simple page with a headline and a button. Add three feature cards below it. Clicking the button changes the page theme. Finally, open the page on your phone to make sure the cards stack neatly.",
    frame_descriptions: [
      { timestampSec: 4, description: "A browser shows a light landing page. Its hero has a bold headline, a short description, and a blue button." },
      { timestampSec: 19, description: "Three feature cards appear below the hero in a horizontal row. Each card has an icon, title, and short paragraph." },
      { timestampSec: 34, description: "The presenter clicks the theme button and the background switches from white to dark navy." },
      { timestampSec: 51, description: "A narrow viewport shows the cards stacked vertically, with no visible horizontal overflow." },
    ],
    visual_summary: null, caption: "Illustrative fixture: build a minimal website with a working theme switch.", metadata: { title: "Build a clean landing page with a theme switch", duration: 60 }, verdict: null, verdict_intent: null, credits_charged: 0, error_message: null, action_items: null, created_at: "2026-09-06T09:00:00Z", completed_at: "2026-09-06T09:01:00Z",
  };
  const { evidence, warnings } = buildSourceEvidence(analysis);
  const plan = parseReplicationPlan({
    version: 1, analysisId: analysis.id, sourceUrl: analysis.source_url, title: "Build a landing page that feels like yours", goal: "Recreate this landing page for my AI consulting business. Use a blue accent, a working theme switch, and three service cards. Keep it easy to edit.", mode: "build",
    summary: "A small, editable website inspired by the demonstrated layout. Reproduce the hero, service cards, and theme switch, then verify the result at desktop and mobile sizes.",
    prerequisites: ["A new local project folder and Codex CLI signed in on your Mac.", "Your business name, headline, and three services. Use clearly marked placeholder copy until supplied.", "A browser available to inspect the finished page."],
    steps: [
      { id: "step-1", instruction: "Inspect the workspace and create a minimal HTML, CSS, and JavaScript project. Keep the copy and colors easy to edit.", evidenceIds: [], kind: "inferred", verification: "The workspace contains the page and its assets, with a documented local preview command." },
      { id: "step-2", instruction: "Build the demonstrated hero and a row of three feature cards, adapting the text to the user's services.", evidenceIds: ["frame-1", "frame-2", "transcript-1"], kind: "inferred", verification: "The preview has a readable headline, a blue primary button, and three service cards." },
      { id: "step-3", instruction: "Add the theme button that switches the page between light and dark backgrounds.", evidenceIds: ["frame-3", "transcript-1"], kind: "observed", verification: "Clicking the theme button changes the background and preserves readable text contrast." },
      { id: "step-4", instruction: "Open the page at a phone-sized viewport and check that the cards stack vertically.", evidenceIds: ["frame-4", "transcript-1"], kind: "observed", verification: "At 390 pixels wide, all content stays within the viewport and the button remains usable." },
    ], evidence, warnings: [...warnings, "The source does not show exact code or font names. Implementation details are proposed, not recovered from the video.", "This is illustrative demo data. No source was scraped and no website has been built."],
    successCriteria: ["The local page loads with the chosen business copy and three service cards.", "The theme button changes the visible theme in both directions.", "Desktop and mobile screenshots show the page without overflow.", "A handoff states what was built, how to run it, and which checks actually passed."],
  });
  return <Suspense fallback={<p className="p-8">Loading demo…</p>}><ReplicationWorkbench demoAnalysis={analysis} demoPlan={plan} /></Suspense>;
}
