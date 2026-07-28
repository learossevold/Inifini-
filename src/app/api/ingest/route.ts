import { NextRequest, NextResponse } from 'next/server';
import { runIngestion } from '@/lib/rss';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel: allow up to 60s for ingestion + summaries

function authorized(req: NextRequest): boolean {
  // Vercel Cron sends this bearer token automatically when CRON_SECRET is set.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`) return true;

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return process.env.NODE_ENV === 'development'; // open only in dev if unset
  return req.headers.get('x-admin-password') === expected;
}

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized. Set ADMIN_PASSWORD and send it as the x-admin-password header (or CRON_SECRET as a bearer token).' }, { status: 401 });
  }
  try {
    const result = await runIngestion(5);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Ingestion failed' }, { status: 500 });
  }
}

// Vercel Cron always issues a GET; /admin's manual "Run ingestion now" uses POST.
export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
