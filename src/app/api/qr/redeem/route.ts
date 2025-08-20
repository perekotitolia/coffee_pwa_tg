import { NextResponse } from 'next/server';
import { verifyQrToken } from '@/lib/jwt';
import { kv } from '@/lib/kv';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { token, vendorId, amount, points } = await req.json();
  if (!token || !vendorId) {
    return NextResponse.json({ error: 'token & vendorId required' }, { status: 400 });
  }

  const raw = String(token).includes('://') ? String(token).split('/').pop()! : String(token);

  try {
    const { did, jti } = await verifyQrToken(raw);

    // одноразовость: NX + TTL 120с
    const ok = await kv.set(`qr:${jti}`, did, { nx: true, ex: 120 });
    if (!ok) return NextResponse.json({ error: 'Already used / expired' }, { status: 409 });

    const credited = typeof points === 'number' ? points : Math.max(1, Math.round((amount || 0) * 0.05));
    return NextResponse.json({ ok: true, did, vendorId, points: credited });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Invalid token' }, { status: 400 });
  }
}
