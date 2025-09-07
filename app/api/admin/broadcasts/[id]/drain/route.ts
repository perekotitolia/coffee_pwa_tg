export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { redis } from '@/lib/redis';
import { sendMessage /*, sendPhotoByUrl */ } from '@/lib/tg';

function assertAdmin(req: Request) {
  const key = process.env.ADMIN_API_KEY;
  if (!key || req.headers.get('x-admin-key') !== key) {
    return NextResponse.json({ ok:false, error:'unauthorized' }, { status: 401 });
  }
  return null;
}

const BATCH = Number(process.env.DRIP_BROADCAST_BATCH || 40);

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const unauth = assertAdmin(req); if (unauth) return unauth;
  const id = Number(params.id);
  const supa = createServerClient();

  let processed = 0;
  for (let i=0;i<BATCH;i++){
    const raw = await redis.lpop(`broadcast:${id}:q`);
    if (!raw) break;
    processed++;
    const job = JSON.parse(raw);
    const { data: c } = await supa.from('campaigns')
      .select('id, body, image_url, button_text, button_url, parse_mode')
      .eq('id', job.campaign_id).single();
    try {
      // тут базово шлемо текст; для фото див. патч до tg.ts нижче
      await sendMessage(String(job.tg_id), c!.body);
      await supa.from('campaign_logs').insert({ campaign_id:id, tg_id: job.tg_id, status:'SENT' });
      await new Promise(r=>setTimeout(r,50));
    } catch (e:any) {
      await supa.from('campaign_logs').insert({
        campaign_id:id, tg_id: job.tg_id, status:'ERROR', error:String(e?.message||e)
      });
    }
  }
  const left = await redis.llen(`broadcast:${id}:q`);
  if (!left) await supa.from('campaigns').update({ state:'done' }).eq('id', id);
  return NextResponse.json({ ok:true, processed, left: Number(left) });
}

const markup = (c.button_text && c.button_url) ? { inline_keyboard: [[{ text: c.button_text, url: c.button_url }]] } : undefined;
await sendMessage(String(job.tg_id), c.body, markup);

if (c.image_url) await sendPhotoByUrl(String(job.tg_id), c.image_url, c.body);
else await sendMessage(String(job.tg_id), c.body, markup);
