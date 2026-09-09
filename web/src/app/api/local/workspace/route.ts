import { NextRequest, NextResponse } from "next/server";
import { isLocalStudioRequest } from "@/lib/local-studio";
import { readBoundedJson } from "@/lib/bounded-json";
import { readWorkspace, saveWorkspaceProfile, WorkspaceError } from "@/lib/local-workspace";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  if (!isLocalStudioRequest(request.headers)) return new NextResponse(null, { status: 404 });
  try { return NextResponse.json(await readWorkspace(), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return failure(error); }
}
export async function PATCH(request: NextRequest) {
  if (!isLocalStudioRequest(request.headers, true)) return new NextResponse(null, { status: 404 });
  try {
    let body;
    try { body = await readBoundedJson(request, 12_000) as { profile: unknown }; }
    catch { throw new WorkspaceError("Your project note is too large or incomplete."); }
    if (!body || Object.keys(body).length !== 1 || !("profile" in body)) throw new WorkspaceError("Provide your project profile.");
    return NextResponse.json(await saveWorkspaceProfile(body.profile), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
function failure(error: unknown) { return NextResponse.json({ error: error instanceof WorkspaceError ? error.message : "Could not save your project. Try again." }, { status: error instanceof WorkspaceError ? error.status : 500 }); }
