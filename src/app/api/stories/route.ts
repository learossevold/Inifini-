import { NextRequest, NextResponse } from 'next/server';
import { getFeed } from '@/lib/stories';
import { getUserAffinity, Affinity } from '@/lib/affinity';
import { supabaseAdmin } from '@/lib/supabase';
import { Category } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10) || 0);
    const tab = searchParams.get('tab') ?? 'news';
    const interests = (searchParams.get('interests') ?? '').split(',').filter(Boolean) as Category[];
    const sources = (searchParams.get('sources') ?? '').split(',').filter(Boolean);
    const onlyInterests = tab === 'following';

    // Explore only, never News: the caller's own reading history nudges
    // ranking within Explore, but News stays the same feed for everyone —
    // see ranking.ts's rankStories for why that split matters.
    let affinity: Affinity | undefined;
    if (onlyInterests) {
      const authHeader = req.headers.get('authorization') ?? '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      const admin = token ? supabaseAdmin() : null;
      if (admin) {
        // A stale or forged token just means no personalisation for this
        // request, not a failure — Explore already works fine on the
        // interest/source filter alone without it.
        const { data: userData } = await admin.auth.getUser(token);
        if (userData?.user?.id) affinity = await getUserAffinity(admin, userData.user.id);
      }
    }

    const feed = await getFeed(page, interests, onlyInterests, sources, affinity);
    // A personalised Explore response must never be cached at a shared
    // (CDN/edge) layer — s-maxage would let one reader's affinity-shaped
    // order be served back to a different reader. News (no affinity) is
    // still safe to share-cache since nothing here varies it per caller.
    const cacheControl = onlyInterests ? 'private, no-store' : 's-maxage=60, stale-while-revalidate=300';
    return NextResponse.json(feed, { headers: { 'cache-control': cacheControl } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Feed unavailable' }, { status: 500 });
  }
}
