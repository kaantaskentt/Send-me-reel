import { NextRequest, NextResponse } from "next/server";
import { isLocalStudioRequest, localStudioRoot } from "@/lib/local-studio";
import { readLocalLibrarySource } from "@/lib/local-library";
import { readConversation } from "@/lib/local-conversation";
import { readBoundedJson } from "@/lib/bounded-json";
import { saveWorkflow, WorkspaceError } from "@/lib/local-workspace";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!isLocalStudioRequest(request.headers, true)) return new NextResponse(null, { status: 404 });
  try {
    let body;
    try { body = await readBoundedJson(request, 1500) as { analysisId: string; messageId: string; title?: string }; }
    catch { throw new WorkspaceError("Choose a saved reply to make a workflow."); }
    if (!body || Object.keys(body).some(k => !["analysisId", "messageId", "title"].includes(k)) || typeof body.analysisId !== "string" || typeof body.messageId !== "string" || (body.title !== undefined && typeof body.title !== "string")) throw new WorkspaceError("Choose a saved reply to make a workflow.");
    const analysis = await readLocalLibrarySource(localStudioRoot, body.analysisId);
    if (!analysis) throw new WorkspaceError("The original source is no longer available.", 404);
    const workflow = await saveWorkflow(analysis, await readConversation(analysis.id), body.messageId, body.title);
    return NextResponse.json({ workflow }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof WorkspaceError ? error.message : "Could not save this workflow. Your conversation is preserved." }, { status: error instanceof WorkspaceError ? error.status : 500 }); }
}
