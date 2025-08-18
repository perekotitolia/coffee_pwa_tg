import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { randomBytes } from 'crypto';

let cache: { cur: Uint8Array; prev?: Uint8Array; ts: number } | null = null;

export async function getQrSecrets() {
  const now = Date.now();
  if (cache && now - cache.ts < 60_000) return cache; // кэш на 60 сек
  const { data, error } = await supabaseAdmin
    .from('qr_secret')
    .select('current_secret, prev_secret')
    .eq('id', true)
    .single();
  if (error || !data) throw new Error('qr_secret missing');
  cache = {
    cur: new TextEncoder().encode(data.current_secret),
    prev: data.prev_secret ? new TextEncoder().encode(data.prev_secret) : undefined,
    ts: now,
  };
  return cache;
}

export function newSecretBase64(len = 64) {
  return randomBytes(len).toString('base64');
}