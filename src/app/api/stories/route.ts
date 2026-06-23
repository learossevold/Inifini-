import { NextRequest, NextResponse } from 'next/server';
import { getFeed } from '@/lib/stories';
import { Category } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10) || 0);
    const tab = searchParams.get('tab') ?? 'news';
    const interests = (searchParams.get('interests') ?? '').split(',').filter(Boolean) as Category[];
    const onlyInterests = tab === 'following';
    const feed = await getFeed(page, interests, onlyInterests);
    return NextResponse.json(feed, { headers: { 'cache-control': 's-maxage=60, stale-while-revalidate=300' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Feed unavailable' }, { status: 500 });
  }
}
