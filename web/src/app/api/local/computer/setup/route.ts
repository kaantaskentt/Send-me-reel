import { NextRequest, NextResponse } from 'next/server';
import { LocalComputerError, localComputerSetup } from '@/lib/local-computer';
import { isLocalStudioRequest } from '@/lib/local-studio';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
function failure(error: unknown) {
  const status = error instanceof LocalComputerError ? error.status : 503;
  if (status === 404) return new NextResponse(null, { status });
  return NextResponse.json({ error: error instanceof LocalComputerError ? error.message : 'Could not check Mac control.' }, { status, headers });
}
export async function GET(request: NextRequest) {
  try { return NextResponse.json(await localComputerSetup(request.headers), { headers }); }
  catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  if (!isLocalStudioRequest(request.headers, true)) return new NextResponse(null, { status: 404 });
  try {
    // A fixed action, not a general OS opener or permission-grant API.
    if (!request.headers.get('content-type')?.startsWith('application/json')) return NextResponse.json({ error: 'Choose Open Mac helper.' }, { status: 400, headers });
    if (!request.body) return NextResponse.json({ error: 'Choose Open Mac helper.' }, { status: 400, headers });
    const reader = request.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > 256) return NextResponse.json({ error: 'Invalid setup action.' }, { status: 400, headers });
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    let body: { action?: unknown };
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { return NextResponse.json({ error: 'Invalid setup action.' }, { status: 400, headers }); }
    if (!body || Object.keys(body).length !== 1 || body.action !== 'open_helper') return NextResponse.json({ error: 'Choose Open Mac helper.' }, { status: 400, headers });
    return NextResponse.json(await localComputerSetup(request.headers, 'open_helper'), { headers });
  } catch (error) { return failure(error); }
}
