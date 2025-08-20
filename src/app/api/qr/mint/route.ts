import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { mintQrToken } from '@/lib/jwt';

export const runtime = 'nodejs';

export async function POST() {
  const store = cookies();
  let did = store.get('did')?.value;

  if (!did) did = crypto.randomUUID();

  const { token, expSec } = await mintQrToken(did, 60);
  const res = NextResponse.json({ token, expiresIn: expSec });

  // ставим cookie, если её не было
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
}
