export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { redis } from '@/lib/redis';
import { tgSend, tgSendPhoto } from '@/lib/tg';

const SECRET = process.env.TELEGRAM_BOT_SECRET!;

async function getPoints(userId: string) {
  return Number(await redis.get(`user:${userId}:points`)) || 0;
}
async function getUserIdByTg(tgId: number): Promise<string|null> {
  const id = await redis.get<string>(`tg:${tgId}:userId`);
  return id ?? null;
}

export async function POST(req: Request) {
  if (req.headers.get('x-telegram-bot-api-secret-token') !== SECRET)
    return NextResponse.json({ ok: true });

  const update = await req.json();
  const msg = update.message;
  if (!msg?.text) return NextResponse.json({ ok: true });

  const chatId = msg.chat.id as number;
  const tgId = msg.from.id as number;
  const text: string = msg.text;

  // /start link-<token> → привязка TG к userId
  if (text.startsWith('/start')) {
    const param = text.split(' ').slice(1).join(' ').trim();
    if (param.startsWith('link-')) {
      const token = param.slice(5);
      const userId = await redis.get<string>(`link:${token}`);
      if (!userId) { await tgSend(chatId, 'Посилання протерміноване. Згенеруй нове в додатку.'); return NextResponse.json({ ok: true }); }
      await redis.del(`link:${token}`);
      await redis.mset({
        [`tg:${tgId}:userId`]: userId,
        [`user:${userId}:tg_chat_id`]: String(chatId),
        [`user:${userId}:tg_username`]: msg.from.username ?? '',
        [`user:${userId}:linked_at`]: new Date().toISOString(),
      });
      await tgSend(chatId, 'Готово! Telegram прив’язано. /balance, /qr — команди.');
      return NextResponse.json({ ok: true });
    }
    await tgSend(chatId, 'Привіт! /balance — баланс, /qr — твій QR.');
    return NextResponse.json({ ok: true });
  }

  if (text === '/balance') {
    const userId = await getUserIdByTg(tgId);
    if (!userId) { await tgSend(chatId, 'Акаунт не прив’язаний. Відкрий /me і натисни «Прив’язати Telegram».'); return NextResponse.json({ ok: true }); }
    const p = await getPoints(userId);
    const need = Math.max(0, 6 - (p % 6));
    await tgSend(chatId, `Баланс: ${p}. До «БЕЗКОШТОВНА КАВА»: ${need}.`);
    return NextResponse.json({ ok: true });
  }

  if (text === '/qr') {
    const userId = await getUserIdByTg(tgId);
    if (!userId) { await tgSend(chatId, 'Спершу прив’яжи акаунт.'); return NextResponse.json({ ok: true }); }
    const link = `${process.env.APP_URL}/me?u=${userId}`;
    const png = await QRCode.toBuffer(link, { margin: 1, scale: 6 });
    await tgSendPhoto(chatId, png);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
