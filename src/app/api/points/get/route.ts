import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'no_user' }, { status: 400 });
  const points = Number(await redis.get(`user:${userId}:points`)) || 0;
  return NextResponse.json({ points });
}
