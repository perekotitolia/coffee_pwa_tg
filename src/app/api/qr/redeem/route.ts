import { NextResponse } from 'next/server';
import { verifyQrToken } from '@/lib/jwt';
import { kv } from '@/lib/kv';
import { log } from '@/lib/logger';

export const runtime = 'nodejs';

type RedeemBody = { token: string; vendorId: string; amount?: number; points?: number };

function meta(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
  const ua = req.headers.get('user-agent') || '';
  return { ip, ua };
}

export async function POST(req: Request) {
  const m = meta(req);
  const { token, vendorId, amount, points } = (await req.json()) as RedeemBody;
  if (!token || !vendorId) {
    log('warn', 'Bad request: token/vendorId missing', { vendorId, ...m });
    return NextResponse.json({ error: 'token & vendorId required' }, { status: 400 });
  }

  const raw = token.includes('://') ? token.split('/').pop()! : token;

  try {
    const { did, jti } = await verifyQrToken(raw);

    // Скан-события
    log('info', 'код покупателя отсканирован', { client_id: did, jti, vendorId, ...m });
    log('info', 'код продавца отсканирован', { vendorId, ...m });

    // anti-replay
    const ok = await kv.set(`qr:${jti}`, did, { nx: true, ex: 120 });
    if (!ok) {
      log('warn', 'Попытка повторно отсканировать код', { client_id: did, vendorId, jti, ...m });
      return NextResponse.json({ error: 'Already used / expired' }, { status: 409 });
    }

    // начисление + общий баланс
    const credited = typeof points === 'number' ? points : Math.max(1, Math.round((amount ?? 0) * 0.05));
    const totalPoints = await kv.incrby(`points:${did}`, credited);

    log('info', 'Баллы начислены клиенту', {
      client_id: did,
      vendorId,
      jti,
      points: credited,
      totalPoints,
    });

    // регистрация магазина при первом появлении
    const firstSeen = await kv.set(`seen:vendor:${vendorId}`, '1', { nx: true, ex: 60 * 60 * 24 * 365 });
    if (firstSeen) log('info', 'Магазин зарегистрирован', { vendorId });

    return NextResponse.json({ ok: true, did, vendorId, points: credited, totalPoints });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const expired = /timestamp check failed|exp/i.test(msg);
    if (expired) {
      log('warn', 'Просроченный QR', { vendorId, ...m });
      return NextResponse.json({ error: 'QR expired — обновите на /me' }, { status: 400 });
    }
    log('error', 'Ошибка верификации QR', { vendorId, error: msg, ...m });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
