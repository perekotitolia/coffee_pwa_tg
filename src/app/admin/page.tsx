'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Html5Qrcode } from 'html5-qrcode';
import type { Session } from '@supabase/supabase-js';

export default function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<'cash' | 'card'>('cash');
  const [shopId, setShopId] = useState<string>('');
  const boxRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function startScan() {
    if (!boxRef.current) return;
    if (!qrRef.current) qrRef.current = new Html5Qrcode('scanner');
    await qrRef.current.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: 250 },
      onScan,
      () => {}
    );
  }

  async function onScan(text: string) {
    await qrRef.current?.stop();
    const access = (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch('/api/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access}` },
      body: JSON.stringify({ token: text, amount, payment_type: paymentType, shop_id: shopId }),
    });
    const d = await res.json();
    alert(d.error ? `Ошибка: ${d.error}` : `Начислено ${d.awarded}. Баланс: ${d.balance}`);
  }

  if (!session) return <LoginForm />;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Админ — начисление баллов</h1>
      <div className="flex gap-2 items-center">
        <input placeholder="Shop ID" className="border p-2" value={shopId} onChange={e => setShopId(e.target.value)} />
        <input type="number" placeholder="Сумма (UAH)" className="border p-2" value={amount} onChange={e => setAmount(parseFloat(e.target.value || '0'))} />
        <select
 		 className="border p-2"
 		 value={paymentType}
 		 onChange={(e) => setPaymentType(e.target.value as 'cash' | 'card')}>
          <option value="cash">Наличные</option>
          <option value="card">Карта</option>
        </select>
      </div>
      <div id="scanner" ref={boxRef} className="w-[300px] h-[300px] border" />
      <button className="px-4 py-2 bg-black text-white rounded" onClick={startScan}>Сканировать QR</button>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  async function send() {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/admin` } });
    if (error) alert(error.message); else setSent(true);
  }
  return (
    <div className="p-6 space-y-3">
      <h1 className="text-xl font-semibold">Вход для персонала</h1>
      <input placeholder="Email" className="border p-2" value={email} onChange={e => setEmail(e.target.value)} />
      <button className="px-4 py-2 bg-black text-white rounded" onClick={send}>Отправить ссылку для входа</button>
      {sent && <p>Проверь почту.</p>}
    </div>
  );
}