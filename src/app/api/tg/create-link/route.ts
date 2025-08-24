
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
  const { userId } = await req.json(); // прокинем с клиента (из getUserId)
  if (!userId) return NextResponse.json({ error: 'no_user' }, { status: 400 });
  const token = randomUUID().replace(/-/g, '');
  await redis.set(`link:${token}`, userId, { ex: 600 }); // 10 мин
  const tme = `https://t.me/${process.env.TG_BOT_USERNAME}?start=link-${token}`;
  return NextResponse.json({ tme });
}
