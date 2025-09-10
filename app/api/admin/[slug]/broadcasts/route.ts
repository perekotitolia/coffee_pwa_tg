// ==============================================================
// FILE: app/api/admin/[slug]/broadcasts/route.ts
// ==============================================================
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { assertBotAdmin } from '@/app/api/_adminAuth';

// GET: список кампаний конкретного бота по slug
export async function GET(req: Request, ctx: any) {
  const slug = String(ctx?.params?.slug ?? '');

  const unauth = assertBotAdmin(req, slug);
  if (unauth) return unauth;

  const supa = createServerClient();

  const { data: bot } = await supa
    .from('bots')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (!bot) {
    return NextResponse.json({ ok: false, error: 'bot not found' }, { status: 404 });
  }

  const { data: items, error } = await supa
    .from('campaigns')
    .select('id, title, state, snapshot, created_at')
    .eq('bot_id', bot.id)
    .order('id', { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, items: items ?? [] });
}

// POST: создать кампанию + (пере)сохранить её сегмент фильтров
export async function POST(req: Request, ctx: any) {
  const slug = String(ctx?.params?.slug ?? '');

  const unauth = assertBotAdmin(req, slug);
  if (unauth) return unauth;

  const supa = createServerClient();

  const { data: bot } = await supa
    .from('bots')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (!bot) {
    return NextResponse.json({ ok: false, error: 'bot not found' }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as any;
  const {
    title,
    body: msg,
    image_url,
    button_text,
    button_url,
    parse_mode,
    filters,
  } = body ?? {};

  const { data: created, error } = await supa
    .from('campaigns')
    .insert({
      bot_id: bot.id,
      title: title ?? null,
      body: msg ?? '',
      image_url: image_url ?? null,
      button_text: button_text ?? null,
      button_url: button_url ?? null,
      parse_mode: parse_mode ?? 'Markdown',
      state: 'draft',
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // сегмент (фильтры) храним отдельно
  await supa.from('campaign_segments').delete().eq('campaign_id', created.id);
  const segIns = await supa
    .from('campaign_segments')
    .insert({ campaign_id: created.id, kind: 'json', filters: filters ?? null });
  if (segIns.error) {
    return NextResponse.json({ ok: false, error: segIns.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: created.id });
}
