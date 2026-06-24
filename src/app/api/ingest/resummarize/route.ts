import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { summarizeStory } from '@/lib/summarize';

function slugify(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return process.env.NODE_ENV === 'development';
  // Accept password via header (POST) or query param (GET, for browser access)
  const fromHeader = req.headers.get('x-admin-password');
  const fromQuery = new URL(req.url).searchParams.get('pw');
  return fromHeader === expected || fromQuery === expected;
}

async function handle(req: NextRequest): Promise<NextResponse> {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase service role key not configured' }, { status: 500 });
  }

  const db = createClient(url, key);

  // Fetch recent published articles, then filter in JS for short summaries
  const { data: articles, error } = await db
    .from('stories')
    .select('id, title, ai_medium_summary, source_name, source_url, category, published_at, language')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(60);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Only re-summarize articles whose summary is too short (old prompt gave ~100–200 chars)
  const toUpdate = (articles ?? []).filter(
    (a: any) => !a.ai_medium_summary || a.ai_medium_summary.length < 500
  ).slice(0, 20);

  if (toUpdate.length === 0) {
    return NextResponse.json({ updated: 0, message: 'All articles already have long summaries.' });
  }

  let updated = 0;
  let failed = 0;

  for (const article of toUpdate) {
    try {
      const input = {
        title: article.title ?? '',
        excerpt: '',
        source_name: article.source_name ?? '',
        source_url: article.source_url ?? '',
        category: article.category ?? 'world',
        published_at: article.published_at ?? new Date().toISOString(),
        language: article.language ?? 'en',
      };
      const { bundle, engine } = await summarizeStory(input);
      const { ai_title, ...rest } = bundle;
      const patch: Record<string, unknown> = { ...rest };
      if (ai_title) {
        patch.title = ai_title;
        patch.slug = slugify(ai_title);
      }
      const { error: upErr } = await db.from('stories').update(patch).eq('id', article.id);
      if (upErr) { failed++; } else { updated++; }
      void engine; // used for logging only
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ updated, failed, total: toUpdate.length });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
