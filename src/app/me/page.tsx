'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function MePage() {
  const [dataUrl, setDataUrl] = useState('');
  const [exp, setExp] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [points, setPoints] = useState<number | null>(null);

  async function refreshQR() {
    try {
      setErr(null);
      const res = await fetch('/api/qr/mint', { method: 'POST' });
      const { token, expiresIn, error } = await res.json();
      if (!res.ok || !token) throw new Error(error || `HTTP ${res.status}`);
      const png = await QRCode.toDataURL(token, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 288,
        scale: 8,
      });
      setDataUrl(png);
      setExp(expiresIn);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setDataUrl('');
      setExp(0);
    }
  }

  async function refreshPoints() {
    try {
      const r = await fetch('/api/me/points', { cache: 'no-store' });
      const j = await r.json();
      setPoints(typeof j.points === 'number' ? j.points : 0);
    } catch {
      // игнор
    }
  }

  useEffect(() => {
    void refreshQR();
    void refreshPoints();
  }, []);

  // периодически обновляем и QR, и баланс
  useEffect(() => {
    if (!exp) return;
    const idQR = setInterval(() => void refreshQR(), Math.max(5, exp - 5) * 1000);
    const idPts = setInterval(() => void refreshPoints(), 5000);
    return () => {
      clearInterval(idQR);
      clearInterval(idPts);
    };
  }, [exp]);

  return (
    <div className="p-6 flex flex-col items-center gap-3">
      {dataUrl && <img src={dataUrl} width={288} height={288} alt="QR" />}
      <div className="text-sm opacity-70">QR оновлюється раз на ~{exp}s</div>
      <div className="text-base">
        Баллы: <b>{points ?? '—'}</b>
      </div>
      {err && <div className="text-sm text-red-500">{err}</div>}
    </div>
  );
}
