import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { createServerClient } from '@/lib/supabaseServer'
import { sendMessage } from '@/lib/tg'

type Payload = { v: number; type: 'user'; deviceId: string; iat: number; exp: number }

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function POST(req: NextRequest) {
  try {
    const { code, reason } = await req.json()
    if (!code) return NextResponse.json({ ok: false, error: 'NO_CODE' }, { status: 400 })

    let payload: Payload
    try {
      payload = JSON.parse(code)
    } catch {
      return NextResponse.json({ ok: false, error: 'BAD_QR' }, { status: 400 })
    }

    if (payload?.type !== 'user' || !payload.deviceId) {
      return NextResponse.json({ ok: false, error: 'BAD_PAYLOAD' }, { status: 400 })
    }

    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) {
      return NextResponse.json({ ok: false, error: 'QR_EXPIRED' }, { status: 400 })
    }

    // Prevent duplicate scans of the same QR payload
    const fingerprint = await redis.setnx(
      ['qr', payload.deviceId, String(payload.iat)].join(':'),
      '1'
    )
    if (!fingerprint) {
      return NextResponse.json({ ok: false, error: 'DUPLICATE' }, { status: 429 })
    }
    await redis.expire(['qr', payload.deviceId, String(payload.iat)].join(':'), payload.exp - now + 5)

    const sb = createServerClient()

    // Upsert profile by deviceId
    const { data: prof1, error: upsertErr } = await sb
      .from('profiles')
      .upsert({ device_id: payload.deviceId }, { onConflict: 'device_id' })
      .select()
      .maybeSingle()
    if (upsertErr || !prof1) {
      return NextResponse.json({ ok: false, error: 'UPSERT_FAIL' }, { status: 500 })
    }

    // +1 point event
    const delta = 1
    const { error: evtErr } = await sb.from('points_events').insert({
      profile_id: prof1.id,
      delta,
      reason: (reason ?? 'scan').toString().slice(0, 64),
      granted_by: 'seller-demo'
    })
    if (evtErr) {
      return NextResponse.json({ ok: false, error: 'EVENT_FAIL' }, { status: 500 })
    }

    // update profile points
    const { data: updated, error: updErr } = await sb
      .from('profiles')
      .update({ points: (prof1.points ?? 0) + delta })
      .eq('id', prof1.id)
      .select()
      .maybeSingle()
    if (updErr || !updated) {
      return NextResponse.json({ ok: false, error: 'POINTS_FAIL' }, { status: 500 })
    }

    // Telegram notify (if linked)
    if (updated.tg_id && process.env.TELEGRAM_BOT_TOKEN) {
      try {
        await sendMessage(updated.tg_id.toString(), `+${delta} бал(ів). Баланс: ${updated.points}`)
      } catch {}
    }

    return NextResponse.json({ ok: true, points: updated.points })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'ERR' }, { status: 500 })
  }
}