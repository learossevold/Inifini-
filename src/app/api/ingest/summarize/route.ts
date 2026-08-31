import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { summarizeStory } from '@/lib/summarize';
import { slugify } from '@/lib/rss';

/**
 * Finishes what runIngestion() (lib/rss.ts) starts: it inserts stories as
 * status: 'pending' with no AI summary, and this endpoint is what turns a
 * small batch of them into real, published stories. Splitting it out this
 * way is what keeps ingestion inside Vercel's function time limit — see the
 * comment at the top of lib/rss.ts for the full reasoning.
 *
 * Meant to be hit on its own short-interval schedule (a second cron-job.org
 * job alongside the one already hitting /api/ingest — see README) rather
 * than Vercel's own Cron Jobs, which on the Hobby plan can't run more often
 * than once a day. Safe to call as often as you like even with nothing
 * pending: it just returns { updated: 0, remaining: 0 }.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Kept small enough that a parallel batch finishes well inside maxDuration. */
const BATCH_SIZE = 8;

function authorized(req: NextRequest): boolean {
  // Vercel Cron sends this bearer token automatically when CRON_SECRET is set;
  // cron-job.org is configured to send it the same way (see README).
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`) return true;

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return process.env.NODE_ENV === 'development'; // open only in dev if unset
  return req.headers.get('x-admin-password') === expected;
}

interface PendingRow {
  id: string;
  title: string;
  original_excerpt: string;
  source_name: string;
  original_url: string;
  category: string;
  published_at: string;
  language: string;
}

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized. Set ADMIN_PASSWORD and send it as the x-admin-password header (or CRON_SECRET as a bearer token).' }, { status: 401 });
  }
  const db = supabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // The batch to work on, plus a cheap indexed count of the full queue —
  // separate from fetching all of it just to measure it, unlike
  // resummarize's 400-row scan (that one's filtering on summary length,
  // which PostgREST can't do server-side; this one only needs a status
  // match, which the database can count directly).
  const [{ data: rows, error }, { count: totalPending }] = await Promise.all([
    db
      .from('stories')
      .select('id, title, original_excerpt, source_name, original_url, category, published_at, language')
      .eq('status', 'pending')
      .order('fetched_at', { ascending: true }) // oldest first, so nothing waits behind a burst of newer arrivals forever
      .limit(BATCH_SIZE),
    db.from('stories').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const toUpdate = (rows as PendingRow[] | null) ?? [];
  if (toUpdate.length === 0) {
    return NextResponse.json({ updated: 0, failed: 0, total: 0, remaining: 0, message: 'Nothing pending.' });
  }

  // Run the AI calls in parallel — sequentially, a full batch overruns the
  // function time limit and the request dies with nothing written (same
  // reasoning as resummarize.ts).
  const summaries = await Promise.all(toUpdate.map(async (row) => {
    try {
      const { bundle } = await summarizeStory({
        title: row.title,
        excerpt: row.original_excerpt ?? '',
        source_name: row.source_name,
        source_url: row.original_url,
        category: row.category,
        published_at: row.published_at,
        language: row.language,
      });
      return { id: row.id, bundle };
    } catch {
      return { id: row.id, bundle: null };
    }
  }));

  let updated = 0;
  let failed = 0;

  await Promise.all(summaries.map(async ({ id, bundle }) => {
    // A failed summarizeStory call still falls back to mockSummary
    // internally (see summarize.ts) — bundle is only null if something
    // above actually threw. Leaving the row 'pending' here means the next
    // batch retries it rather than publishing it with nothing at all.
    if (!bundle) { failed++; return; }
    const { ai_title, ...rest } = bundle;
    const patch: Record<string, unknown> = { ...rest, status: 'published' };
    if (ai_title) {
      patch.title = ai_title;
      patch.slug = slugify(ai_title);
    }
    const { error: upErr } = await db.from('stories').update(patch).eq('id', id);
    if (upErr) failed++; else updated++;
  }));

  return NextResponse.json({
    updated,
    failed,
    total: toUpdate.length,
    remaining: Math.max(0, (totalPending ?? 0) - updated),
  });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
