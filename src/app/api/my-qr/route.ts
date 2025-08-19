import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { SignJWT } from 'jose';
import { randomUUID } from 'crypto';
import { getQrSecrets } from '@/lib/secrets'; // если используешь 6A

export async function GET() {
  const jar = await cookies();               // ⟵ было cookies()
  let cid = jar.get('cid')?.value;

  if (!cid) {
    const { data, error } = await supabaseAdmin.from('customers').insert({}).select('id').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    cid = data!.id;
    jar.set('cid', cid, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60*60*24*365 });
  }

  const now = Math.floor(Date.now() / 1000);
  // если 6A:
  const { cur } = await getQrSecrets();
  const token = await new SignJWT({ cid, nonce: randomUUID() })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + 60)
    .sign(cur); // или secret, если без 6A

  return NextResponse.json({ token });
}
