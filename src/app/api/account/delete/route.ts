import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Permanently deletes the caller's account.
 *
 * Required by GDPR and by App Store review for any app with sign-in. The
 * caller proves who they are with their own access token; the service role
 * then removes the auth user, and every `on delete cascade` reference
 * (profile, interests, friendships, messages, comments, saves, likes,
 * blocks, push subscriptions) goes with it.
 *
 * Comments are cascade-deleted with the user, so nothing they wrote is left
 * attributed to a dangling id.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const db = supabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: 'Account deletion is not available right now.' }, { status: 500 });
  }

  // Verify the token belongs to a real, current user before deleting anything.
  const { data: userData, error: userError } = await db.auth.getUser(token);
  const userId = userData?.user?.id;
  if (userError || !userId) {
    return NextResponse.json({ error: 'Your session has expired. Sign in again and retry.' }, { status: 401 });
  }

  // Push subscriptions key on endpoint, not user, so clear them explicitly.
  await db.from('push_subscriptions').delete().eq('user_id', userId);

  const { error: deleteError } = await db.auth.admin.deleteUser(userId);
  if (deleteError) {
    return NextResponse.json({ error: 'Could not delete the account. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
