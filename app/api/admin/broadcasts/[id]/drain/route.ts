// ==============================================================
// FILE: app/api/admin/broadcasts/[id]/drain/route.ts
// ==============================================================
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { redis } from '@/lib/redis'
import { sendMessage, sendPhotoByUrl } from '@/lib/tg'


function assertAdmin(req: Request) {
const key = process.env.ADMIN_API_KEY
if (!key || req.headers.get('x-admin-key') !== key) {
return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
}
return null
}


const BATCH = Number(process.env.DRIP_BROADCAST_BATCH || 40)


export async function POST(req: Request, { params }: any) {
try {
const unauth = assertAdmin(req); if (unauth) return unauth
const id = Number(params.id)
const supa = createServerClient()


let processed = 0
for (let i = 0; i < BATCH; i++) {
  const raw = await redis.lpop(`broadcast:${id}:q` as any) as any
  if (!raw) break
  processed++

  // robust parse: string -> JSON.parse, object -> as is, other -> try stringify
  let job: any
  try {
    if (typeof raw === 'string') {
      job = JSON.parse(raw)
    } else if (raw && typeof raw === 'object') {
      job = raw
    } else {
      job = JSON.parse(String(raw))
    }
  } catch {
    // логируем битый элемент и продолжаем
    await supa.from('campaign_logs').insert({
      campaign_id: id,
      tg_id: null,
      status: 'ERROR',
      error: `Bad queue payload: ${typeof raw} ${String(raw)}`
    })
    continue
  }

  const { data: c } = await supa.from('campaigns')
    .select('id, body, image_url, button_text, button_url, parse_mode')
    .eq('id', job.campaign_id).single()

  try {
    const markup = (c?.button_text && c?.button_url)
      ? { inline_keyboard: [[{ text: c.button_text, url: c.button_url }]] }
      : undefined

    if (c?.image_url) {
      await sendPhotoByUrl(String(job.tg_id), c.image_url, {
        caption: c.body,
        parse_mode: c?.parse_mode === 'HTML' ? 'HTML' : 'Markdown',
        reply_markup: markup
      })
    } else {
      await sendMessage(String(job.tg_id), c!.body, {
        parse_mode: c?.parse_mode === 'HTML' ? 'HTML' : 'Markdown',
        reply_markup: markup
      })
    }

    await supa.from('campaign_logs').insert({ campaign_id: id, tg_id: job.tg_id, status: 'SENT' })
    await new Promise(r => setTimeout(r, 50))
  } catch (e: any) {
    await supa.from('campaign_logs').insert({
      campaign_id: id, tg_id: job.tg_id, status: 'ERROR', error: String(e?.message || e)
    })
  }
}

const left = await redis.llen(`broadcast:${id}:q`)
if (!left) await supa.from('campaigns').update({ state: 'done' }).eq('id', id)
return NextResponse.json({ ok: true, processed, left: Number(left) })
} catch (e: any) {
console.error('[drain] error', e)
return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
}
}


/**
* Tests (run locally):
* curl -X POST -H "x-admin-key: $ADMIN_API_KEY" https://<host>/api/admin/broadcasts/123/drain
*/