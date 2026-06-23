import { NextRequest, NextResponse } from 'next/server';
import { runIngestion } from '@/lib/rss';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel: allow up to 60s for ingestion + summaries

function authorized(req: NextRequest): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return process.env.NODE_ENV === 'development'; // open only in dev if unset
  return req.headers.get('x-admin-password') === expected;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized. Set ADMIN_PASSWORD and send it as the x-admin-password header.' }, { status: 401 });
  }
  try {
    const result = await runIngestion(10);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Ingestion failed' }, { status: 500 });
  }
}
