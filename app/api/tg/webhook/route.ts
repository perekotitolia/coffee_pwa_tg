import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { sendMessage } from '@/lib/tg'

type Update = {
  message?: {
    message_id: number
    from: { id: number; is_bot: boolean; first_name?: string; username?: string }
    chat: { id: number; type: string }
    text?: string
    entities?: { offset: number; length: number; type: string }[]
  }
}

export async function POST(req: NextRequest) {
  try {
    // Optional: lightweight header check to protect from random posts
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET
    const header = req.headers.get('x-telegram-bot-api-secret-token')
    if (secret && header !== secret) {
      return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 })
    }

    const upd = (await req.json()) as Update
    const msg = upd.message
    if (!msg?.text) return NextResponse.json({ ok: true })

    const chatId = msg.chat.id
    const text = msg.text.trim()

    const sb = createServerClient()

    // commands
    if (text.startsWith('/start')) {
      const parts = text.split(' ')
      const param = parts[1] || ''
      if (param.startsWith('link-')) {
        const token = param.slice('link-'.length)
        const { data: prof, error } = await sb.from('profiles').select('*').eq('link_token', token).maybeSingle()
        if (prof && !error) {
          await sb.from('profiles').update({ tg_id: chatId }).eq('id', prof.id)
          await sendMessage(chatId.toString(), 'Телеграм успішно привʼязано ✅')
        } else {
          await sendMessage(chatId.toString(), 'Токен недійсний або прострочений.')
        }
      } else {
        await sendMessage(chatId.toString(), 'Вітаю! Надішліть /balance щоб перевірити баланс.')
      }
    } else if (text === '/balance') {
      const { data: prof } = await sb.from('profiles').select('*').eq('tg_id', chatId).maybeSingle()
      const pts = prof?.points ?? 0
      await sendMessage(chatId.toString(), `Ваш баланс: ${pts}`)
    } else if (text === '/qr') {
      await sendMessage(chatId.toString(), 'Відкрийте свій QR у додатку: /me')
    } else {
      await sendMessage(chatId.toString(), 'Команди: /start, /balance, /qr')
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'ERR' }, { status: 500 })
  }
}