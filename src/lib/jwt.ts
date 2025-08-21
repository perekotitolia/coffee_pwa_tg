import { SignJWT, jwtVerify, JWTPayload } from 'jose';

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is missing');
  return new TextEncoder().encode(s);
}

export async function mintQrToken(did: string, ttlSec = 60) {
  const jti = crypto.randomUUID();
  const token = await new SignJWT({ did, jti })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(`${ttlSec}s`)
    .sign(getSecret());
  return { token, jti, expSec: ttlSec };
}

type QrPayload = JWTPayload & { did?: string; jti?: string };

export async function verifyQrToken(token: string): Promise<{ did: string; jti: string }> {
  const { payload } = await jwtVerify(token, getSecret(), {
    algorithms: ['HS256'],
    clockTolerance: 15, // небольшой допуск по времени, чтобы не ловить "timestamp check failed"
  });
  const p = payload as QrPayload;
  if (typeof p.did !== 'string' || typeof p.jti !== 'string') throw new Error('Bad token payload');
  return { did: p.did, jti: p.jti };
}
