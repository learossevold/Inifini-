import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Stores (or removes) one device's push subscription. Uses the service role
 * key so `push_subscriptions` stays unreadable via the anon key — a device
 * can only ever write its own endpoint, which the browser generated.
 */

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const endpoint = String(body?.endpoint ?? '');
  const p256dh = String(body?.keys?.p256dh ?? '');
  const auth = String(body?.keys?.auth ?? '');
  if (!endpoint.startsWith('https://') || !p256dh || !auth) {
    return NextResponse.json({ error: 'Invalid subscription.' }, { status: 400 });
  }

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: 'Notifications are not set up yet.' }, { status: 500 });

  const { error } = await db.from('push_subscriptions').upsert({ endpoint, p256dh, auth }, { onConflict: 'endpoint' });
  if (error) return NextResponse.json({ error: 'Could not save the subscription.' }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const endpoint = String(body?.endpoint ?? '');
  if (!endpoint) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: 'Notifications are not set up yet.' }, { status: 500 });

  await db.from('push_subscriptions').delete().eq('endpoint', endpoint);
  return NextResponse.json({ ok: true });
}
