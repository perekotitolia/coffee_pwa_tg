// src/app/api/qr/mint/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { mintQrToken } from '@/lib/jwt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handleMint() {
  try {
    const store = await cookies();
    const did = store.get('did')?.value ?? crypto.randomUUID();
    const { token, expSec } = await mintQrToken(did, 60);
    const res = NextResponse.json({ token, expiresIn: expSec }, { headers: { 'Cache-Control': 'no-store' } });
    if (!store.get('did')) {
      res.cookies.set({ name: 'did', value: did, httpOnly: true, sameSite: 'lax', secure: true, maxAge: 60*60*24*365, path: '/' });
    }
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
export async function POST() { return handleMint(); }
export async function GET()  { return handleMint(); }
