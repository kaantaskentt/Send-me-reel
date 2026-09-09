import { NextRequest, NextResponse } from "next/server";
import { isLocalStudioRequest } from "@/lib/local-studio";
import { readWorkspace, workflowSkill, WorkspaceError } from "@/lib/local-workspace";

export const runtime = "nodejs";
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isLocalStudioRequest(request.headers)) return new NextResponse(null, { status: 404 });
  try {
    const { id } = await context.params;
    const workflow = (await readWorkspace()).workflows.find(item => item.id === id);
    if (!workflow) return NextResponse.json({ error: "This workflow is not saved on this Mac." }, { status: 404 });
    return new NextResponse(workflowSkill(workflow), { headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": 'attachment; filename="SKILL.md"', "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return NextResponse.json({ error: error instanceof WorkspaceError ? error.message : "Could not export the saved workflow." }, { status: error instanceof WorkspaceError ? error.status : 500 }); }
}
