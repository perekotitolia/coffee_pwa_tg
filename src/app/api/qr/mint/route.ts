import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { mintQrToken } from '@/lib/jwt';
import { log } from '@/lib/logger';
import { kv } from '@/lib/kv';                 // ⬅️ добавили

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getClientMeta(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
  const ua = req.headers.get('user-agent') || '';
  return { ip, ua };
}

async function handleMint(req: Request) {
  try {
    const meta = getClientMeta(req);
    const store = await cookies();
    const did = store.get('did')?.value ?? crypto.randomUUID();

    // ⬇️ отметим первого клиента и залогируем с client_id
    const firstSeen = await kv.set(`seen:client:${did}`, '1', { nx: true, ex: 60 * 60 * 24 * 365 });
    if (firstSeen) log('info', 'клиент зарегистрирован', { client_id: did, ...meta });

    const { token, jti, expSec } = await mintQrToken(did, 60);
    log('info', 'Код покупателя сгенерирован', { client_id: did, jti, expSec, ...meta });

    const res = NextResponse.json(
      { token, expiresIn: expSec },
      { headers: { 'Cache-Control': 'no-store' } }
    );

    if (!store.get('did')) {
      res.cookies.set({
        name: 'did',
        value: did,
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });
    }
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log('error', 'Mint error', { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) { return handleMint(req); }
export async function GET(req: Request)  { return handleMint(req); }

