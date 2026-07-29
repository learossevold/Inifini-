import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { synthesizeSpeech } from '@/lib/narrate';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Hobby cap — keep the batch small enough to fit.

const BUCKET = 'watch-audio';
const BATCH_SIZE = 8;

function authorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`) return true;
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return process.env.NODE_ENV === 'development';
  return req.headers.get('x-admin-password') === expected;
}

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized. Set ADMIN_PASSWORD and send it as the x-admin-password header (or CRON_SECRET as a bearer token).' }, { status: 401 });
  }

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  if (!process.env.OPENAI_API_KEY_TTS) {
    return NextResponse.json({ narrated: 0, message: 'OPENAI_API_KEY_TTS not set — Watch stays on silent caption cards.' });
  }

  // Storage bucket for the generated audio; created once, then reused.
  const { error: bucketErr } = await db.storage.getBucket(BUCKET);
  if (bucketErr) await db.storage.createBucket(BUCKET, { public: true });

  const { data: rows, error } = await db
    .from('stories')
    .select('id, ai_short_summary')
    .eq('status', 'published')
    .eq('audio_status', 'none')
    .order('published_at', { ascending: false })
    .limit(BATCH_SIZE);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const targets = ((rows as { id: string; ai_short_summary: string }[]) ?? []).filter((r) => r.ai_short_summary?.trim());
  let narrated = 0;
  let failed = 0;

  for (const story of targets) {
    const audio = await synthesizeSpeech(story.ai_short_summary);
    if (!audio) {
      failed++;
      await db.from('stories').update({ audio_status: 'failed' }).eq('id', story.id);
      continue;
    }
    const path = `${story.id}.mp3`;
    const { error: upErr } = await db.storage.from(BUCKET).upload(path, audio, { contentType: 'audio/mpeg', upsert: true });
    if (upErr) {
      failed++;
      await db.from('stories').update({ audio_status: 'failed' }).eq('id', story.id);
      continue;
    }
    const { data: pub } = db.storage.from(BUCKET).getPublicUrl(path);
    await db.from('stories').update({ audio_url: pub.publicUrl, audio_status: 'ready' }).eq('id', story.id);
    narrated++;
  }

  return NextResponse.json({ narrated, failed, total: targets.length });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
