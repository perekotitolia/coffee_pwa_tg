import { redis } from './redis'

export async function hitOnce(key: string, ttlSeconds: number): Promise<boolean> {
  const ok = await redis.setnx(key, '1')
  if (ok) await redis.expire(key, ttlSeconds)
  return !!ok
}