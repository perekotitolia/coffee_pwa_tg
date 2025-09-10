// app/api/admin/[slug]/broadcasts/[id]/drain/route.ts
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { redis } from '@/lib/redis'
import { makeTg } from '@/lib/tg'
import { assertBotAdmin } from '@/app/api/_adminAuth'

const BATCH = Number(process.env.DRIP_BROADCAST_BATCH || 40)

export async function POST(req: Request, ctx: any) {
  const { params } = (ctx ?? {}) as any;

  const unauth = assertBotAdmin(req, params.slug); if (unauth) return unauth
  const id = Number(params.id)
  const supa = createServerClient()

  const { data: camp } = await supa.from('campaigns')
    .select('id, body, image_url, button_text, button_url, parse_mode, bot_id')
    .eq('id', id).maybeSingle()
  if (!camp) return NextResponse.json({ ok: false, error: 'campaign not found' }, { status: 404 })

  const { data: bot } = await supa.from('bots').select('token, parse_mode').eq('id', camp.bot_id).maybeSingle()
  if (!bot) return NextResponse.json({ ok: false, error: 'bot not found' }, { status: 404 })
  const tg = makeTg(bot.token)

  let processed = 0
  for (let i = 0; i < BATCH; i++) {
    const raw = await redis.lpop(`broadcast:${id}:q` as any) as any
    if (!raw) break
    processed++
    const job = JSON.parse(typeof raw === 'string' ? raw : String(raw))

    try {
      const markup = (camp.button_text && camp.button_url)
        ? { inline_keyboard: [[{ text: camp.button_text, url: camp.button_url }]] }
        : undefined
      if (camp.image_url) {
        await tg.sendPhotoByUrl(String(job.tg_id), camp.image_url, {
          caption: camp.body,
          parse_mode: (camp.parse_mode || 'Markdown'),
          reply_markup: markup
        })
      } else {
        await tg.sendMessage(String(job.tg_id), camp.body, {
          parse_mode: (camp.parse_mode || 'Markdown'),
          reply_markup: markup
        })
      }
      await supa.from('campaign_logs').insert({ campaign_id: id, tg_id: job.tg_id, status: 'SENT' })
      await new Promise(r => setTimeout(r, 50))
    } catch (e: any) {
      await supa.from('campaign_logs').insert({ campaign_id: id, tg_id: job.tg_id, status: 'ERROR', error: String(e?.message || e) })
    }
  }

  const left = await redis.llen(`broadcast:${id}:q`)
  if (!left) await supa.from('campaigns').update({ state: 'done' }).eq('id', id)
  return NextResponse.json({ ok: true, processed, left: Number(left) })
}