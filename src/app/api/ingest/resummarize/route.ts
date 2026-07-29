import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { summarizeStory } from '@/lib/summarize';

function slugify(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Kept small enough that a parallel batch finishes well inside maxDuration. */
const BATCH_SIZE = 8;

function authorized(req: NextRequest): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return process.env.NODE_ENV === 'development';
  return req.headers.get('x-admin-password') === expected;
}

async function handle(req: NextRequest): Promise<NextResponse> {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized. Set ADMIN_PASSWORD and send it as the x-admin-password header.' }, { status: 401 });
  }
  const db = supabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Fetch recent published articles, then filter in JS for short summaries
  const { data: articles, error } = await db
    .from('stories')
    .select('id, title, ai_medium_summary, original_excerpt, source_name, original_url, category, published_at, language')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(400);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // PostgREST can't filter on text length, so the short ones are picked out
  // here. Scanning well past the newest page matters: freshly ingested stories
  // already have long summaries, and the ones needing a rewrite are older.
  const short = (articles ?? []).filter(
    (a: any) => !a.ai_medium_summary || a.ai_medium_summary.length < 500
  );
  const remaining = short.length;
  const toUpdate = short.slice(0, BATCH_SIZE);

  if (toUpdate.length === 0) {
    return NextResponse.json({ updated: 0, remaining: 0, message: 'All articles already have long summaries.' });
  }

  // Run the AI calls in parallel — sequentially, a full batch overruns the
  // function time limit and the request dies with nothing written.
  const summaries = await Promise.all(toUpdate.map(async (article: any) => {
    try {
      const { bundle } = await summarizeStory({
        title: article.title ?? '',
        excerpt: article.original_excerpt ?? '',
        source_name: article.source_name ?? '',
        source_url: article.original_url ?? '',
        category: article.category ?? 'world',
        published_at: article.published_at ?? new Date().toISOString(),
        language: article.language ?? 'en',
      });
      return { id: article.id, bundle };
    } catch {
      return { id: article.id, bundle: null };
    }
  }));

  let updated = 0;
  let failed = 0;

  await Promise.all(summaries.map(async ({ id, bundle }) => {
    if (!bundle) { failed++; return; }
    const { ai_title, ...rest } = bundle;
    const patch: Record<string, unknown> = { ...rest };
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
    remaining: Math.max(0, remaining - updated),
  });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
