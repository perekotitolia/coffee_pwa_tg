'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function MePage() {
  const [dataUrl, setDataUrl] = useState('');
  const [exp, setExp] = useState(0);
  const [err, setErr] = useState<string|null>(null);
async function refresh() {
  try {
    setErr(null);
    const res = await fetch('/api/qr/mint', { method: 'POST' });
    const { token, expiresIn, error } = await res.json();
    if (!res.ok || !token) throw new Error(error || `HTTP ${res.status}`);
    const png = await QRCode.toDataURL(token, { errorCorrectionLevel: 'M', margin: 2, width: 288, scale: 8 });
    setDataUrl(png); setExp(expiresIn);
  } catch (e) {
    setErr(e instanceof Error ? e.message : String(e));
    setDataUrl(''); setExp(0);
  }
}
  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    if (!exp) return; const id = setInterval(refresh, Math.max(5, exp - 5) * 1000);
    return () => clearInterval(id);
  }, [exp]);

  return (
    <div className="p-6 flex flex-col items-center gap-2">
      {dataUrl && <img src={dataUrl} width={288} height={288} alt="QR" />}
      <div className="text-sm opacity-70">QR оновлюється раз на ~{exp}s</div>
    </div>
  );
}