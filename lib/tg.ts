// Convert Uint8Array/Buffer to a clean ArrayBuffer slice for Blob
// Make sure BlobPart is a plain Uint8Array (not SharedArrayBuffer-backed)
function toPngBlob(u8: Uint8Array) {
  const copy = new Uint8Array(u8.byteLength)
  copy.set(u8)
  return new Blob([copy], { type: 'image/png' })
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

export async function sendPhotoByUrl(chatId: string, photoUrl: string, caption?: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN missing');
  const url = `https://api.telegram.org/bot${token}/sendPhoto`;
  const res = await fetch(url, {
    method:'POST',
    headers:{ 'content-type':'application/json' },
    body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption }),
  });
  if (!res.ok) throw new Error(`TG sendPhoto failed: ${res.status} ${await res.text()}`);
}


export async function sendMessage(chatId: string, text: string, replyMarkup?: any) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN missing');
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method:'POST',
    headers:{ 'content-type':'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) }),
  });
  if (!res.ok) throw new Error(`TG sendMessage failed: ${res.status} ${await res.text()}`);
}

