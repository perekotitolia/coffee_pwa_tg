'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function MyQR() {
  const [img, setImg] = useState('');
  const [size, setSize] = useState(160); // базовый размер поменьше
  const [big, setBig] = useState(false);

  async function refresh(w = size) {
    const r = await fetch('/api/my-qr', { cache: 'no-store' });
    const { token } = await r.json();
    const dataUrl = await QRCode.toDataURL(token, {
      margin: 0,
      width: w,                  // генерим сразу под нужный размер
      errorCorrectionLevel: 'M', // хорошо читается с экрана
    });
    setImg(dataUrl);
  }

  useEffect(() => {
    refresh(size);
    const id = setInterval(() => refresh(size), 45_000);
    return () => clearInterval(id);
  }, [size]);

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        {img && (
          <img
            src={img}
            alt="Мой QR"
            width={size}
            height={size}
            className="rounded-md shadow cursor-pointer"
            onClick={() => { setBig(true); setSize(320); }} // тап — во весь экран
          />
        )}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button
            className="px-2 py-1 border rounded"
            onClick={() => setSize(s => (s === 160 ? 200 : 160))}
          >
            {size === 160 ? 'Крупнее' : 'Мельче'}
          </button>
          <span>QR обновляется ~каждые 45 сек</span>
        </div>
      </div>

      {big && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => { setBig(false); setSize(160); }}
        >
          <img src={img} alt="QR" className="w-80 h-80" />
        </div>
      )}
    </>
  );
}
