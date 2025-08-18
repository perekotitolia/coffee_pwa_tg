import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  const cid = cookies().get('cid')?.value;
  if (!cid) return NextResponse.json({ points: 0 });
  const { data } = await supabaseAdmin
    .from('customer_points')
    .select('points')
    .eq('customer_id', cid)
    .single();
  return NextResponse.json({ points: data?.points ?? 0 });
}