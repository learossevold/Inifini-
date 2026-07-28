import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * The morning brief: one notification a day with the day's lead story.
 *
 * Runs on a cron (see vercel.json) shortly after ingestion, so it always has
 * fresh stories to point at. Subscriptions the push service rejects as gone
 * (404/410) are deleted, which is how dead devices get cleaned up.
 */

function authorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`) return true;
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return process.env.NODE_ENV === 'development';
  return req.headers.get('x-admin-password') === expected;
}

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_CONTACT_EMAIL || 'admin@inifini.app';
  if (!publicKey || !privateKey) {
    return NextResponse.json({ sent: 0, message: 'VAPID keys not set — notifications are off.' });
  }
  webpush.setVapidDetails(`mailto:${contact}`, publicKey, privateKey);

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: 'Supabase not configured.' }, { status: 500 });

  // Lead story: most important thing published in the last day.
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data: stories } = await db
    .from('stories')
    .select('title, slug, ai_short_summary, importance_score, published_at')
    .eq('status', 'published')
    .gte('published_at', since)
    .order('importance_score', { ascending: false })
    .limit(1);

  const lead = (stories as any[])?.[0];
  if (!lead) {
    return NextResponse.json({ sent: 0, message: 'No fresh stories to send.' });
  }

  const { data: subs } = await db.from('push_subscriptions').select('endpoint, p256dh, auth');
  const subscriptions = (subs as { endpoint: string; p256dh: string; auth: string }[]) ?? [];
  if (subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, message: 'Nobody has enabled notifications yet.' });
  }

  const payload = JSON.stringify({
    title: 'Your morning brief',
    body: lead.title,
    url: `/s/${lead.slug}`,
    tag: 'inifini-brief',
  });

  let sent = 0;
  let removed = 0;
  const stale: string[] = [];

  await Promise.all(subscriptions.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      );
      sent++;
    } catch (e: any) {
      // 404/410 mean the browser dropped the subscription — stop sending to it.
      if (e?.statusCode === 404 || e?.statusCode === 410) stale.push(s.endpoint);
    }
  }));

  if (stale.length) {
    await db.from('push_subscriptions').delete().in('endpoint', stale);
    removed = stale.length;
  }

  return NextResponse.json({ sent, removed, total: subscriptions.length, story: lead.title });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
