import { Suspense } from "react";
import ReplicationWorkbench from "@/components/dashboard/ReplicationWorkbench";

export const metadata = { title: "Execution workbench | ContextDrop" };

export default function ReplicatePage() {
  return <Suspense fallback={<p className="p-8 text-sm text-slate-500">Loading workbench…</p>}><ReplicationWorkbench /></Suspense>;
}
