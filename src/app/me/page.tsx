
'use client';
import MyQR from '@/components/MyQR';

export default function Page() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Мой QR</h1>
      <MyQR />
      <Points />
    </div>
  );
}

import { useEffect, useState } from 'react';

function Points() {
  const [points, setPoints] = useState<number>(0);
  useEffect(() => {
    fetch('/api/my-points').then(r => r.json()).then(d => setPoints(d.points || 0));
  }, []);
  return <div className="text-lg">Баллы: <b>{points}</b></div>;
}