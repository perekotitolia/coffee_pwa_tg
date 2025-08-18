import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { jwtVerify } from 'jose';
import { getQrSecrets } from '@/lib/secrets';

const secret = new TextEncoder().encode(process.env.QR_SIGNING_SECRET!);
const ppp = parseInt(process.env.POINTS_PER_PURCHASE || '1', 10);

export async function POST(req: NextRequest) {
  try {
    const { token, amount, payment_type, shop_id } = await req.json();
    if (!token || !amount || !payment_type || !shop_id)
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    // Проверим QR-токен
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    const cid = payload['cid'] as string;
    if (!cid) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });

    // Проверим сотрудника по токену Supabase (Bearer)
    const auth = req.headers.get('authorization');
    if (!auth?.startsWith('Bearer '))
      return NextResponse.json({ error: 'No auth' }, { status: 401 });
    const access = auth.slice(7);
    const { data: u, error: ue } = await supabaseAdmin.auth.getUser(access);
    if (ue || !u?.user) return NextResponse.json({ error: 'Invalid staff token' }, { status: 401 });

    const amount_cents = Math.round(Number(amount) * 100);

    // Создаём транзакцию
    const { data: tx, error: txErr } = await supabaseAdmin
      .from('transactions')
      .insert({
        shop_id,
        customer_id: cid,
        amount_cents,
        payment_type,
        cashier_user_id: u.user.id,
      })
      .select('id')
      .single();
    if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });

    const points = ppp; // фиксированное начисление за покупку
    const { error: pErr } = await supabaseAdmin
      .from('points_ledger')
      .insert({ customer_id: cid, delta_points: points, reason: 'purchase', tx_id: tx.id });
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

    const { data: bal } = await supabaseAdmin
      .from('customer_points')
      .select('points')
      .eq('customer_id', cid)
      .single();

    return NextResponse.json({ ok: true, cid, tx_id: tx.id, awarded: points, balance: bal?.points ?? points });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
const { cur, prev } = await getQrSecrets();
let payload;
try {
  ({ payload } = await jwtVerify(token, cur, { algorithms: ['HS256'] }));
} catch {
  if (!prev) throw new Error('Invalid token');
  ({ payload } = await jwtVerify(token, prev, { algorithms: ['HS256'] }));
}