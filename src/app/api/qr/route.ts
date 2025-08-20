import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { SignJWT } from 'jose';
import { randomUUID } from 'crypto';
// если делаешь 6A:
import { getQrSecrets } from '@/lib/secrets';
// если НЕ делаешь 6A, вместо строки выше используй:
// const secret = new TextEncoder().encode(process.env.QR_SIGNING_SECRET!);

export async function GET() {
  const jar = await cookies();                     // в Next 15 — async
  let cid = jar.get('cid')?.value;
  let needSet = false;

  // если клиента ещё нет — создаём и помечаем, что нужно выставить куку
  if (!cid) {
    const { data, error } = await supabaseAdmin
      .from('customers')
      .insert({})
      .select('id')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    cid = data!.id;
    needSet = true;
  }

  const now = Math.floor(Date.now() / 1000);

  // 6A: подписываем current-секретом
  const { cur } = await getQrSecrets();
  // если без 6A — раскомментируй строку ниже и удали getQrSecrets():
  // const cur = new TextEncoder().encode(process.env.QR_SIGNING_SECRET!);

  const token = await new SignJWT({ cid, nonce: randomUUID() })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + 60)
    .sign(cur);

  // куку ставим ТОЛЬКО на ответе
  const res = NextResponse.json({ token });
  if (needSet) {
    res.cookies.set('cid', cid!, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 год
    });
  }
  return res;
}
