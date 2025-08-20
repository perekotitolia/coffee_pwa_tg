'use client';
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

function useVendorId() {
  const [vendorId, setVendorId] = useState('');
  useEffect(() => {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get('shop_id');
    if (fromUrl) { localStorage.setItem('vendorId', fromUrl); setVendorId(fromUrl); return; }
    const saved = localStorage.getItem('vendorId');
    if (saved) setVendorId(saved);
  }, []);
  const save = (v: string) => { localStorage.setItem('vendorId', v); setVendorId(v); };
  return { vendorId, save };
}

export default function SellerPage() {
  const { vendorId, save } = useVendorId();
  const [status, setStatus] = useState('');
  const qrRef = useRef<Html5Qrcode | null>(null);

  async function startScanner() {
    if (!vendorId) return;
    setStatus('Запуск камери…');
    const id = 'qr-reader';
    if (!qrRef.current) qrRef.current = new Html5Qrcode(id, { verbose: false });

    const config = {
      fps: 10,
      qrbox: 260,
      aspectRatio: 1,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
    } as const;

    try {
      await qrRef.current.start(
        { facingMode: 'environment' },
        config,
        async (decodedText: string) => {
          try {
            setStatus('Надсилаю…');
            const resp = await fetch('/api/qr/redeem', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: decodedText, vendorId }),
            });
            const json = await resp.json();
            if (!resp.ok) throw new Error(json.error || 'Redeem failed');
            setStatus(`OK: +${json.points} (did:${json.did.slice(0, 8)}…)`);
            await qrRef.current?.pause(true);
            setTimeout(() => qrRef.current?.resume(), 1500);
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setStatus(`Помилка: ${msg}`);
          }
        },
        () => {}
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus('Камера не стартанула: ' + msg);
    }
  }

  async function stopScanner() {
    try { await qrRef.current?.stop(); await qrRef.current?.clear(); } catch {}
  }
  useEffect(() => () => { stopScanner(); }, []);

  return (
    <div className="p-4 max-w-sm mx-auto">
      <h1 className="text-lg font-semibold mb-3">Seller Scanner</h1>
      {!vendorId && (
        <div className="mb-3">
          <label className="text-sm">shop_id</label>
          <input className="border rounded w-full p-2" onChange={e => save(e.target.value.trim())} placeholder="coffee-01" />
          <p className="text-xs opacity-70 mt-1">Збережеться в браузері. Можна через URL: <code>?shop_id=coffee-01</code></p>
        </div>
      )}
      {vendorId && <div className="mb-2 text-sm">Текущий shop_id: <b>{vendorId}</b></div>}
      <div id="qr-reader" className="w-full aspect-square bg-black/5 rounded" />
      <div className="flex gap-2 mt-3">
        <button className="px-3 py-2 rounded bg-black text-white" onClick={startScanner}>Запустити</button>
        <button className="px-3 py-2 rounded border" onClick={stopScanner}>Стоп</button>
      </div>
      <div className="mt-3 text-sm opacity-80">{status}</div>
    </div>
  );
}
