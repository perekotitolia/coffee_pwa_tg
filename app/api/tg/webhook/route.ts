export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { sendMessage, sendPhoto } from '@/lib/tg'
import { redis } from '@/lib/redis'
import QRCode from 'qrcode'

type Update = {
  message?: {
    message_id: number
    from: { id: number; is_bot: boolean; first_name?: string; username?: string }
    chat: { id: number; type: string }
    text?: string
  }
}

type State = { step?: 'ask_name' | 'ask_dob' }

async function getState(chatId: number): Promise<State | null> {
  return (await redis.get(`tg:state:${chatId}`)) as State | null
}
async function setState(chatId: number, state: State, ttl = 600) {
  await redis.set(`tg:state:${chatId}`, state, { ex: ttl })
}
async function clearState(chatId: number) {
  await redis.del(`tg:state:${chatId}`)
}
function parseDob(input: string): string | null {
  const m = input.trim().match(/^(\d{4})[-./](\d{2})[-./](\d{2})$/)
  if (!m) return null
  const [_, y, mo, d] = m
  return `${y}-${mo}-${d}`
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET
    const header = req.headers.get('x-telegram-bot-api-secret-token')
    if (secret && header !== secret) {
      return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 })
    }

    const upd = (await req.json()) as Update
    const msg = upd.message
    const site = getSiteBase(req)
    if (!msg?.text) return NextResponse.json({ ok: true })

    const chatId = msg.chat.id
    const text = msg.text.trim()

    const sb = createServerClient()

    // === stateful answers (name / dob) ===
    if (!text.startsWith('/')) {
      const st = await getState(chatId)
      if (st?.step === 'ask_name') {
        const name = text.slice(0, 80)
        await sb.from('profiles').update({ full_name: name }).eq('tg_id', chatId)
        await sendMessage(chatId.toString(), 'Дякую! Тепер надішліть дату народження у форматі YYYY-MM-DD (необов’язково).')
        await setState(chatId, { step: 'ask_dob' })
        return NextResponse.json({ ok: true })
      }
      if (st?.step === 'ask_dob') {
        const dob = parseDob(text)
        if (!dob) {
          await sendMessage(chatId.toString(), 'Будь ласка, використайте формат YYYY-MM-DD, напр.: 1995-07-28')
          return NextResponse.json({ ok: true })
        }
        await sb.from('profiles').update({ dob }).eq('tg_id', chatId)
        await clearState(chatId)
        await sendMessage(chatId.toString(), 'Чудово! Дані збережено. /qr — ваш QR, /balance — баланс. Якщо не хочете отримувати розсилки — /optout.')
        return NextResponse.json({ ok: true })
      }
    }

    // === commands ===
    if (text.startsWith('/start')) {
      const parts = text.split(' ')
      const param = parts[1] || ''
      if (param.startsWith('link-')) {
        const token = param.slice('link-'.length)
        const { data: prof, error } = await sb.from('profiles').select('*').eq('link_token', token).maybeSingle()
        if (prof && !error) {
          await sb.from('profiles').update({ tg_id: chatId, link_token: null }).eq('id', prof.id)
          await sendMessage(chatId.toString(), 'Телеграм успішно привʼязано ✅\nЯк до вас звертатися? Напишіть ім’я.')
          await setState(chatId, { step: 'ask_name' })
        } else {
          await sendMessage(chatId.toString(), 'Токен недійсний або прострочений.')
        }
      } else {
        await sendMessage(chatId.toString(), 'Вітаю! Надішліть /balance щоб перевірити баланс. Ваш QR: команда /qr')
      }
    } else if (text === '/balance') {
      const { data: prof } = await sb.from('profiles').select('*').eq('tg_id', chatId).maybeSingle()
      const pts = prof?.points ?? 0
      await sendMessage(chatId.toString(), `Ваш баланс: ${pts}`)
    } else if (text === '/qr') {
      const { data: prof } = await sb.from('profiles').select('*').eq('tg_id', chatId).maybeSingle()
      if (!prof?.device_id) {
        await sendMessage(chatId.toString(), 'Спочатку привʼяжіть додаток кнопкою у розділі ${site}/me.')
      } else {
        const now = Math.floor(Date.now() / 1000)
        const payload = { v: 1, type: 'user', deviceId: prof.device_id, iat: now, exp: now + 45 }
        const png = await QRCode.toBuffer(JSON.stringify(payload), { errorCorrectionLevel: 'M', margin: 1, scale: 6 })
        await sendPhoto(chatId.toString(), png, 'Ваш QR (дійсний 45с)')
      }
    } else if (text === '/optout') {
      await sb.from('profiles').update({ marketing_opt_in: false }).eq('tg_id', chatId)
      await sendMessage(chatId.toString(), 'Ви відписалися від маркетингових повідомлень. /optin — щоб знову підписатися.')
    } else if (text === '/optin') {
      await sb.from('profiles').update({ marketing_opt_in: true }).eq('tg_id', chatId)
      await sendMessage(chatId.toString(), 'Підписка на повідомлення увімкнена. Дякуємо!')
    } else {
      await sendMessage(chatId.toString(), 'Сайт: ${site}, Команди: /start, /balance, /qr, /optin, /optout')
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'ERR' }, { status: 500 })
  }
}
