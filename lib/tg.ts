// Convert Uint8Array/Buffer to a clean ArrayBuffer slice for Blob
// Make sure BlobPart is a plain Uint8Array (not SharedArrayBuffer-backed)
function toPngBlob(u8: Uint8Array) {
  const copy = new Uint8Array(u8.byteLength)
  copy.set(u8)
  return new Blob([copy], { type: 'image/png' })
}
// lib/tg.ts
export function makeTg(token?: string) {
  const t = token || process.env.TELEGRAM_BOT_TOKEN!
  if (!t) throw new Error('TELEGRAM_BOT_TOKEN missing (and no token passed)')

  async function sendMessage(chatId: string | number, text: string, extra?: any) {
    const url = `https://api.telegram.org/bot${t}/sendMessage`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, ...(extra || {}) })
    })
    if (!res.ok) throw new Error(`TG sendMessage ${res.status} ${await res.text()}`)
  }

  async function sendPhotoByUrl(chatId: string | number, photoUrl: string, extra?: any) {
    const url = `https://api.telegram.org/bot${t}/sendPhoto`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, photo: photoUrl, ...(extra || {}) })
    })
    if (!res.ok) throw new Error(`TG sendPhoto ${res.status} ${await res.text()}`)
  }

  return { sendMessage, sendPhotoByUrl }
}

export async function sendPhoto(chatId: string, png: Uint8Array, caption?: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN missing')
  const url = `https://api.telegram.org/bot${token}/sendPhoto`
  const form = new FormData()
  form.append('chat_id', chatId)
  form.append('photo', toPngBlob(png), 'qr.png')
  if (caption) form.append('caption', caption)
  const res = await fetch(url, { method: 'POST', body: form })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`TG sendPhoto failed: ${res.status} ${body}`)
  }
}



// ==============================================================
// FILE: lib/tg.ts
// ==============================================================
export type InlineKeyboard = { inline_keyboard: { text: string; url?: string; callback_data?: string }[][] }

type SendOpts = { parse_mode?: 'Markdown' | 'HTML'; reply_markup?: InlineKeyboard; disable_web_page_preview?: boolean }

type PhotoOpts = { caption?: string; parse_mode?: 'Markdown' | 'HTML'; reply_markup?: InlineKeyboard }

export async function sendMessage(chatId: string, text: string, opts: SendOpts = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN missing')
  const url = `https://api.telegram.org/bot${token}/sendMessage`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, ...opts })
  })
  if (!res.ok) throw new Error(`TG sendMessage failed: ${res.status} ${await res.text()}`)
}

export async function sendPhotoByUrl(chatId: string, photoUrl: string, opts: PhotoOpts = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN missing')
  const url = `https://api.telegram.org/bot${token}/sendPhoto`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, photo: photoUrl, ...opts })
  })
  if (!res.ok) throw new Error(`TG sendPhoto failed: ${res.status} ${await res.text()}`)
}


