/** curl -X POST -H "x-admin-key: $ADMIN_API_KEY" https://<host>/api/admin/broadcasts/123/start */

// ==============================================================
// FILE: app/api/admin/broadcasts/[id]/snapshot/route.ts
// ==============================================================
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'

function assertAdmin3(req: Request) {
  const key = process.env.ADMIN_API_KEY
  if (!key || req.headers.get('x-admin-key') !== key) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  return null
}

export async function POST(req: Request, context: { params: { id: string } }) {
  const unauth = assertAdmin3(req); if (unauth) return unauth
  const id = Number(context.params.id)
  const supa = createServerClient()

  const { data: seg } = await supa.from('campaign_segments').select('*').eq('campaign_id', id).maybeSingle()
  const f = (seg?.filters || {}) as any
  const sources = f.sources?.length ? f.sources : ['profiles', 'customers']
  const view = sources.includes('profiles') && sources.includes('customers')
    ? 'v_audience_all'
    : (sources.includes('profiles') ? 'v_audience_profiles' : 'v_audience_customers')

  let q = supa.from(view).select('tg_id', { count: 'exact' })
  if (f.marketing_only) q = q.eq('opt_in', true)
  if (typeof f.min_points === 'number') q = q.or(`points.is.null,points.gte.${f.min_points}`)
  if (f.last_active_days) {
    const since = new Date(Date.now() - f.last_active_days * 24 * 3600 * 1000).toISOString()
    q = q.gte('last_activity_at', since)
  }
  if (Array.isArray(f.shop_ids) && f.shop_ids.length) q = q.in('last_shop_id', f.shop_ids)
  if (Array.isArray(f.include_tg_ids) && f.include_tg_ids.length) q = q.in('tg_id', f.include_tg_ids.map(Number))
  if (Array.isArray(f.exclude_tg_ids) && f.exclude_tg_ids.length) q = q.not('tg_id', 'in', `(${f.exclude_tg_ids.map(Number).join(',')})`)

  const acc: number[] = []
  let from = 0; const step = 1000
  while (true) {
    const { data, error } = await q.range(from, from + step - 1)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    if (!data?.length) break
    for (const r of data) if (r.tg_id) acc.push(Number(r.tg_id))
    if (data.length < step) break
    from += step
  }

  await supa.from('campaign_recipients').delete().eq('campaign_id', id)
  for (let i = 0; i < acc.length; i += 1000) {
    const rows = acc.slice(i, i + 1000).map(tg_id => ({ campaign_id: id, tg_id }))
    const { error } = await supa.from('campaign_recipients').insert(rows)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  await supa.from('campaigns').update({ state: 'snapshotted' }).eq('id', id)
  return NextResponse.json({ ok: true, total: acc.length })
}