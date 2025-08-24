export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { tgSend } from '@/lib/tg';

export async function POST(req: Request) {
  if (req.headers.get('x-pos-secret') !== process.env.POS_SECRET)
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { userId, delta } = await req.json() as { userId: string; delta: number };
  if (!userId || !Number.isFinite(delta)) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  const prev = Number(await redis.get(`user:${userId}:points`)) || 0;
  const next = prev + delta;
  await redis.set(`user:${userId}:points`, next);

  const chat = await redis.get<string>(`user:${userId}:tg_chat_id`);
  if (chat) {
    const chatId = Number(chat);
    await tgSend(chatId, `+${delta} балів. Баланс: ${next}.`);
    const before = Math.floor(prev / 6), after = Math.floor(next / 6);
    if (after > before) await tgSend(chatId, '🎉 БЕЗКОШТОВНА КАВА! Покажи QR на кассі.');
  }

  return NextResponse.json({ ok: true, next });
}
