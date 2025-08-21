'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const TARGET = 6; // 6 кружочків до безкоштовної

export default function MePage() {
  const [dataUrl, setDataUrl] = useState('');
  const [exp, setExp] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [points, setPoints] = useState<number | null>(null);

  const [showCongrats, setShowCongrats] = useState(false);
  const [lastCycleShown, setLastCycleShown] = useState(-1);

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
      const p = typeof j.points === 'number' ? j.points : 0;
      setPoints(p);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    void refreshQR();
    void refreshPoints();
  }, []);

  // періодичне оновлення
  useEffect(() => {
    if (!exp) return;
    const idQR = setInterval(() => void refreshQR(), Math.max(5, exp - 5) * 1000);
    const idPts = setInterval(() => void refreshPoints(), 5000);
    return () => {
      clearInterval(idQR);
      clearInterval(idPts);
    };
  }, [exp]);

  // показати банер, коли заповнено ще один повний цикл з 6
  useEffect(() => {
    const p = points ?? 0;
    const cycle = Math.floor(p / TARGET);
    const filled = p % TARGET;
    if (p > 0 && filled === 0 && cycle !== lastCycleShown) {
      setShowCongrats(true);
      setLastCycleShown(cycle);
      const t = setTimeout(() => setShowCongrats(false), 4000);
      return () => clearTimeout(t);
    }
  }, [points, lastCycleShown]);

  const p = Math.max(0, points ?? 0);
  const filled = p % TARGET;
  const remaining = (TARGET - filled) % TARGET;

  return (
    <div className="p-6 flex flex-col items-center gap-4">
      {dataUrl && <img src={dataUrl} width={288} height={288} alt="QR" />}
      <div className="text-sm opacity-70">QR оновлюється раз на ~{exp}s</div>

      <div className="flex flex-col items-center gap-2">
        <div className="text-base">Бали: <b>{points ?? '—'}</b></div>

        {/* Пунш-карта на 6 кружків */}
        <div className="flex gap-3">
          {Array.from({ length: TARGET }).map((_, i) => (
            <div
              key={i}
              className={
                'w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ' +
                (i < filled
                  ? 'bg-black text-white border-black shadow-sm scale-100'
                  : 'bg-transparent text-black/40 border-black/30')
              }
              aria-label={i < filled ? 'Отметка' : 'Пусто'}
            >
              {i < filled ? '●' : ''}
            </div>
          ))}
        </div>

        <div className="text-xs opacity-70">
          {remaining > 0 ? `Залишилось: ${remaining}` : 'Готово!'}
        </div>
      </div>

      {err && <div className="text-sm text-red-500">{err}</div>}

      {/* Банер "БЕЗКОШТОВНА КАВА" */}
      {showCongrats && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-lg"
        >
          БЕЗКОШТОВНА КАВА
        </div>
      )}
    </div>
  );
}
