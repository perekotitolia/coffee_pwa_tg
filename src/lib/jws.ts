import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function mintQrToken(did: string, ttlSec = 60) {
  const jti = crypto.randomUUID();
  const token = await new SignJWT({ did, jti })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(`${ttlSec}s`)
    .sign(secret);
  return { token, jti, expSec: ttlSec };
}

export async function verifyQrToken(token: string) {
  const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
  const { did, jti } = payload as any;
  if (!did || !jti) throw new Error('Bad token payload');
  return { did, jti };
}
