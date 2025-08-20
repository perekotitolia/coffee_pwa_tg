'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';

type Checks = { hasJWT: boolean; hasUpstashUrl: boolean; hasUpstashToken: boolean };

function useVendorId() {
  const [vendorId, setVendorId] = useState('');
  useEffect(() => {
    const saved = localStorage.getItem('vendorId');
    if (saved) setVendorId(saved);
  }, []);
  const save = (v: string) => { localStorage.setItem('vendorId', v); setVendorId(v); };
  const clear = () => { localStorage.removeItem('vendorId'); setVendorId(''); };
  return { vendorId, save, clear };
}

export default function AdminPage() {
  const { vendorId, save, clear } = useVendorId();
  const [png, setPng] = useState('');
  const [checks, setChecks] = useState<Checks | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  async function runChecks() {
    const res = await fetch('/api/admin/check', { cache: 'no-store' });
    setChecks(await res.json());
  }

  async function mintOnce() {
  setLoading(true);
  setErr(null);
  setPng('');
  try {
    const r = await fetch('/api/qr/mint', { method: 'POST' });
    const j = await r.json();
    if (!r.ok || !j?.token) throw new Error(j?.error || `HTTP ${r.status}`);
    const img = await QRCode.toDataURL(j.token, { errorCorrectionLevel: 'M', margin: 2, width: 288, scale: 8 });
    setPng(img);
  } catch (e) {
    setErr(e instanceof Error ? e.message : String(e));
  } finally {
    setLoading(false);
  }
}

  useEffect(() => { runChecks(); }, []);

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Admin</h1>

      <section className="space-y-2">
        <h2 className="font-medium">Быстрые ссылки</h2>
        <div className="flex gap-3">
          <Link className="underline" href="/me">/me</Link>
          <Link className="underline" href="/seller">/seller</Link>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">shop_id (vendorId)</h2>
        <div className="flex gap-2">
          <input className="border rounded p-2 flex-1" placeholder="coffee-01" value={vendorId} onChange={e => save(e.target.value.trim())} />
          <button className="border rounded px-3" onClick={clear}>clear</button>
        </div>
        <p className="text-xs opacity-70">Хранится в localStorage и используется /seller. Можно также передавать через URL: <code>?shop_id=...</code></p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Проверки окружения</h2>
        <button className="px-3 py-2 rounded bg-black text-white" onClick={runChecks}>Проверить</button>
        {checks && (
          <ul className="text-sm list-disc ml-5">
            <li>JWT_SECRET: {checks.hasJWT ? 'OK' : 'нет'}</li>
            <li>UPSTASH_REDIS_REST_URL: {checks.hasUpstashUrl ? 'OK' : 'нет'}</li>
            <li>UPSTASH_REDIS_REST_TOKEN: {checks.hasUpstashToken ? 'OK' : 'нет'}</li>
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Сгенерировать тестовый QR</h2>
        <button className="px-3 py-2 rounded border" onClick={mintOnce} disabled={loading}>{loading ? '…' : 'Mint'}</button>
{err && <p className="text-xs text-red-500">Ошибка: {err}</p>}

        {png && (
          <div className="flex flex-col items-center gap-2">
            <img src={png} width={288} height={288} alt="QR" />
            <p className="text-xs opacity-70">Наведи на него сканером в /seller</p>
          </div>
        )}
      </section>
    </div>
  );
}