import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { mintQrToken } from '@/lib/jwt';
import { log } from '@/lib/logger';

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
    const store = await cookies(); // Next 15
    const did = store.get('did')?.value ?? crypto.randomUUID();

    const { token, jti, expSec } = await mintQrToken(did, 60);

    log('info', 'Код покупателя сгенерирован', { did, jti, expSec, ...meta });

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
export async function GET(req: Request)  { return handleMint(req); } // удобно тестить в браузере
