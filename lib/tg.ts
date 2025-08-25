export async function sendMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN missing')
  const url = `https://api.telegram.org/bot${token}/sendMessage`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`TG sendMessage failed: ${res.status} ${body}`)
  }
}

// Convert Uint8Array/Buffer to a clean ArrayBuffer slice for Blob
function toPngBlob(u8: Uint8Array) {
  const ab = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength)
  return new Blob([ab], { type: 'image/png' })
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
