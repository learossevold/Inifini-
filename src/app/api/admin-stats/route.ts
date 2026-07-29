import { NextRequest, NextResponse } from 'next/server';
import { supabasePublic, supabaseAdmin } from '@/lib/supabase';
import { RSS_SOURCES } from '@/config/sources';
import { MOCK_STORIES } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

function authorized(req: NextRequest): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return process.env.NODE_ENV === 'development';
  return req.headers.get('x-admin-password') === expected;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = supabasePublic();
  const aiEngine = process.env.ANTHROPIC_API_KEY ? 'anthropic' : process.env.OPENAI_API_KEY ? 'openai' : 'mock (no API key)';

  if (!db) {
    return NextResponse.json({
      mode: 'mock',
      storyCount: MOCK_STORIES.length,
      sourceCount: RSS_SOURCES.length,
      lastIngestion: null,
      aiEngine,
      waitlistCount: 0,
      sources: RSS_SOURCES.map((s) => ({ name: s.name, domain: s.domain, active: s.active, last_status: 'database not configured', last_fetched_at: null })),
      recentStories: MOCK_STORIES.slice(0, 10).map((s) => ({ title: s.title, source_name: s.source_name, published_at: s.published_at, is_demo: s.is_demo })),
    });
  }

  const admin = supabaseAdmin(); // waitlist has no public select policy — needs the service role key
  const [{ count: storyCount }, { data: sources }, { data: recent }, waitlistRes] = await Promise.all([
    db.from('stories').select('*', { count: 'exact', head: true }),
    db.from('sources').select('name, domain, active, last_status, last_fetched_at').order('name'),
    db.from('stories').select('title, source_name, published_at, is_demo, fetched_at').order('fetched_at', { ascending: false }).limit(10),
    admin ? admin.from('waitlist').select('*', { count: 'exact', head: true }) : Promise.resolve({ count: 0 }),
  ]);

  const lastIngestion = sources?.reduce<string | null>((acc, s: any) => {
    if (!s.last_fetched_at) return acc;
    return !acc || s.last_fetched_at > acc ? s.last_fetched_at : acc;
  }, null);

  return NextResponse.json({
    mode: 'live',
    storyCount: storyCount ?? 0,
    sourceCount: sources?.length ?? RSS_SOURCES.length,
    lastIngestion,
    aiEngine,
    waitlistCount: (waitlistRes as any).count ?? 0,
    sources: sources ?? [],
    recentStories: recent ?? [],
  });
}
