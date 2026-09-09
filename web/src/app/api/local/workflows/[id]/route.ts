import { NextRequest, NextResponse } from "next/server";
import { isLocalStudioRequest } from "@/lib/local-studio";
import { removeWorkflow, WorkspaceError } from "@/lib/local-workspace";

export const runtime = "nodejs";
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isLocalStudioRequest(request.headers, true)) return new NextResponse(null, { status: 404 });
  try { return NextResponse.json(await removeWorkflow((await context.params).id), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return NextResponse.json({ error: error instanceof WorkspaceError ? error.message : "Could not remove this workflow." }, { status: error instanceof WorkspaceError ? error.status : 500 }); }
}
