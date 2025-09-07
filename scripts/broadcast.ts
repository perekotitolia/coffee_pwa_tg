import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { Pool } from 'pg';

const bot = new Telegraf(process.env.BOT_TOKEN!);
const db  = new Pool({ connectionString: process.env.DATABASE_URL });

const sleep = (ms:number)=> new Promise(r=>setTimeout(r,ms));

async function* targets() {
  const { rows } = await db.query<{tg_id:string}>(`
    SELECT tg_id::text FROM v_broadcast_targets ORDER BY tg_id
  `);
  for (const r of rows) yield r.tg_id;
}

async function sendSafe(chatId:string, text:string, replyMarkup?:any){
  while(true){
    try {
      await bot.telegram.sendMessage(chatId, text, replyMarkup ? { reply_markup: replyMarkup } : undefined);
      return;
    } catch (e:any){
      if (e?.parameters?.retry_after) { await sleep((e.parameters.retry_after+1)*1000); continue; }
      if (e?.error_code === 403 || String(e?.description||'').includes('blocked')) {
        await db.query('UPDATE subscriptions SET is_subscribed=false WHERE tg_id=$1', [chatId]);
        return;
      }
      throw e;
    }
  }
}

(async ()=>{
  const text = process.argv.slice(2).join(' ').trim();
  if (!text) throw new Error('Pass text: node scripts/broadcast.ts "message"');

  let ok=0, blocked=0, failed=0;
  for await (const chatId of targets()){
    try{
      await sendSafe(chatId, text, { inline_keyboard: [[{ text: 'Отписаться', callback_data: 'UNSUB' }]] });
      ok++; await sleep(50); // мягкий троттлинг
    } catch(e){
      failed++;
    }
  }
  await db.end();
  console.log({ ok, blocked, failed });
  process.exit(0);
})();
