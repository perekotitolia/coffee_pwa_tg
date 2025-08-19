import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { newSecretBase64 } from '@/lib/secrets';

async function isAdmin(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return false;
  const access = auth.slice(7);
  const { data: u } = await supabaseAdmin.auth.getUser(access);
  if (!u?.user) return false;
  const { data: st } = await supabaseAdmin
    .from('staff')
    .select('role')
    .eq('user_id', u.user.id)
    .single();
  return st?.role === 'admin';
}

async function rotate() {
  const { data: row } = await supabaseAdmin
    .from('qr_secret')
    .select('current_secret')
    .eq('id', true)
    .single();
  const newSec = newSecretBase64(64);
  const { error } = await supabaseAdmin
    .from('qr_secret')
    .update({
      prev_secret: row?.current_secret ?? null,
      current_secret: newSec,
      updated_at: new Date().toISOString(),
    })
    .eq('id', true);
  if (error) throw error;
}

export async function GET(req: NextRequest) { // для Vercel Cron (GET)
  try {
    const okByToken = new URL(req.url).searchParams.get('token') === process.env.CRON_ROTATE_TOKEN;
    if (!okByToken && !(await isAdmin(req))) throw new Error('Forbidden');
    await rotate();
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: msg }, { status: 403 });
  }
}

export const POST = GET; // поддержим и POST