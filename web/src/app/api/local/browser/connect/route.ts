import { NextRequest, NextResponse } from 'next/server';
import { LocalChromeConnectionError, prepareLocalChromeConnection } from '@/lib/local-chrome-connection';

export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  try {
    return NextResponse.json(await prepareLocalChromeConnection(request.headers), { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } });
  } catch (error) {
    const status = error instanceof LocalChromeConnectionError ? error.status : 503;
    if (status === 404) return new NextResponse(null, { status });
    return NextResponse.json({ error: error instanceof LocalChromeConnectionError ? error.message : 'Could not connect Chrome. Try again.' }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}
