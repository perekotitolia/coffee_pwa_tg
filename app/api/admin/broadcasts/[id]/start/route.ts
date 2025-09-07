// ==============================================================
// FILE: app/api/admin/broadcasts/[id]/start/route.ts
// ==============================================================
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { redis } from '@/lib/redis'

function assertAdmin2(req: Request) {
  const key = process.env.ADMIN_API_KEY
  if (!key || req.headers.get('x-admin-key') !== key) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  return null
}

export async function POST(req: Request, { params }: any) {
  const unauth = assertAdmin2(req); if (unauth) return unauth
  const id = Number(params.id)
  const supa = createServerClient()

  const { data: recs, error } = await supa.from('campaign_recipients').select('tg_id').eq('campaign_id', id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const payloads = (recs || []).map(r => JSON.stringify({ campaign_id: id, tg_id: Number(r.tg_id) }))
  if (payloads.length) await redis.lpush(`broadcast:${id}:q`, ...payloads)

  await supa.from('campaigns').update({ state: 'sending' }).eq('id', id)
  return NextResponse.json({ ok: true, queued: payloads.length })
}