// src/app/api/award/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { jwtVerify } from 'jose';
import { getQrSecrets } from '@/lib/secrets';

const ppp = parseInt(process.env.POINTS_PER_PURCHASE || '1', 10);

type Body = {
  token: string;
  amount: number | string;
  payment_type: 'cash' | 'card';
  shop_id: string;
};

export async function POST(req: NextRequest) {
  try {
    const { token, amount, payment_type, shop_id } = (await req.json()) as Body;
    if (!token || !amount || !payment_type || !shop_id) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // --- verify QR (current -> prev) ---
    const { cur, prev } = await getQrSecrets();
    let verified;
    try {
      verified = await jwtVerify(token, cur, { algorithms: ['HS256'] });
    } catch {
      if (!prev) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
      verified = await jwtVerify(token, prev, { algorithms: ['HS256'] });
    }
    const payload = verified.payload as Record<string, unknown>;
    const cid = payload['cid'] as string | undefined;
    if (!cid) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });

    // --- staff auth (Bearer access token) ---
    const auth = req.headers.get('authorization');
    if (!auth?.startsWith('Bearer '))
      return NextResponse.json({ error: 'No auth' }, { status: 401 });
    const access = auth.slice(7);
    const { data: u, error: ue } = await supabaseAdmin.auth.getUser(access);
    if (ue || !u?.user)
      return NextResponse.json({ error: 'Invalid staff token' }, { status: 401 });

    // --- write tx + award points ---
    const amount_cents = Math.round(Number(amount) * 100);

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

    const points = ppp;
    const { error: pErr } = await supabaseAdmin
      .from('points_ledger')
      .insert({ customer_id: cid, delta_points: points, reason: 'purchase', tx_id: tx.id });
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

    const { data: bal } = await supabaseAdmin
      .from('customer_points')
      .select('points')
      .eq('customer_id', cid)
      .single();

    return NextResponse.json({
      ok: true,
      cid,
      tx_id: tx.id,
      awarded: points,
      balance: bal?.points ?? points,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
