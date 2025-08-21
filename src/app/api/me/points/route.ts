import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { kv } from '@/lib/kv';

export const runtime = 'nodejs';

export async function GET() {
  const store = await cookies();
  const did = store.get('did')?.value;
  if (!did) return NextResponse.json({ points: 0 }, { headers: { 'Cache-Control': 'no-store' } });

  const total = await kv.get<number>(`points:${did}`);
  return NextResponse.json(
    { points: typeof total === 'number' ? total : 0 },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
