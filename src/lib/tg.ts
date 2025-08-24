const API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
export async function tgSend(chat_id: number, text: string) {
  await fetch(`${API}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text }),
  });
}
export async function tgSendPhoto(chat_id: number, png: Buffer) {
  const form = new FormData();
  form.append('chat_id', String(chat_id));
  form.append('photo', new Blob([png]), 'qr.png');
  await fetch(`${API}/sendPhoto`, { method: 'POST', body: form });
}
