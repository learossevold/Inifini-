import { NextRequest, NextResponse } from 'next/server';
import { supabasePublic } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Called from the pre-launch landing page, which is hosted separately
// (an Artifact, not this app) — so this one public, low-sensitivity,
// insert-only endpoint allows cross-origin requests.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers: CORS_HEADERS });
  }

  const email = String(body?.email ?? '').trim().toLowerCase();
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400, headers: CORS_HEADERS });
  }

  const db = supabasePublic();
  if (!db) {
    return NextResponse.json({ error: 'Waitlist is not set up yet.' }, { status: 500, headers: CORS_HEADERS });
  }

  const source = typeof body?.source === 'string' ? body.source.slice(0, 80) : null;
  const { error } = await db.from('waitlist').insert({ email, source });

  // Resubmitting the same email is treated as a success — no spam, no leaking who already joined.
  if (error && !error.message.toLowerCase().includes('duplicate')) {
    return NextResponse.json({ error: 'Could not join the waitlist right now — try again shortly.' }, { status: 500, headers: CORS_HEADERS });
  }

  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
}
