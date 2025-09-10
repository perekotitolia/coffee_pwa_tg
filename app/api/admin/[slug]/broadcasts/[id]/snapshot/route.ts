// ==============================================================
// FILE: app/api/admin/[slug]/broadcasts/[id]/snapshot/route.ts
// ==============================================================
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { assertBotAdmin } from '@/app/api/_adminAuth';

export async function POST(req: Request, ctx: any) {
  try {
    const { params } = (ctx ?? {}) as any;

    // auth
    const unauth = assertBotAdmin(req, params?.slug);
    if (unauth) return unauth;

    // ids
    const id = Number(params?.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ ok: false, error: 'bad id' }, { status: 400 });
    }

    const supa = createServerClient();

    // campaign
    const { data: camp } = await supa
      .from('campaigns')
      .select('id, bot_id')
      .eq('id', id)
      .maybeSingle();
    if (!camp) {
      return NextResponse.json({ ok: false, error: 'campaign not found' }, { status: 404 });
    }

    // bot
    const { data: bot } = await supa
      .from('bots')
      .select('id, shop_id')
      .eq('id', camp.bot_id)
      .maybeSingle();
    if (!bot) {
      return NextResponse.json({ ok: false, error: 'bot not found' }, { status: 404 });
    }

    // сегмент
    const { data: seg } = await supa
      .from('campaign_segments')
      .select('*')
      .eq('campaign_id', id)
      .maybeSingle();

    const f = (seg?.filters || {}) as any;
    const sources = f.sources?.length ? f.sources : ['profiles', 'customers'];
    const view =
      sources.includes('profiles') && sources.includes('customers')
        ? 'v_audience_all'
        : sources.includes('profiles')
          ? 'v_audience_profiles'
          : 'v_audience_customers';

    let q = supa.from(view).select('tg_id', { count: 'exact' });

    if (f.marketing_only) q = q.eq('opt_in', true);
    if (typeof f.min_points === 'number') q = q.or(`points.is.null,points.gte.${f.min_points}`);
    if (f.last_active_days) {
      const since = new Date(Date.now() - f.last_active_days * 24 * 3600 * 1000).toISOString();
      q = q.gte('last_activity_at', since);
    }
    if (Array.isArray(f.shop_ids) && f.shop_ids.length) q = q.in('last_shop_id', f.shop_ids);
    if (Array.isArray(f.include_tg_ids) && f.i
