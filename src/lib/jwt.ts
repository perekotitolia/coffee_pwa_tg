import { SignJWT, jwtVerify, JWTPayload } from 'jose';

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

type QrPayload = JWTPayload & { did?: string; jti?: string };

export async function verifyQrToken(token: string): Promise<{ did: string; jti: string }> {
  const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
  const p = payload as QrPayload;
  if (typeof p.did !== 'string' || typeof p.jti !== 'string') {
    throw new Error('Bad token payload');
  }
  return { did: p.did, jti: p.jti };
}
