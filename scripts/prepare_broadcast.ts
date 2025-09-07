import 'dotenv/config';
import { Pool } from 'pg';

const db = new Pool({ connectionString: process.env.DATABASE_URL });

const SAFE = /^[a-zA-Z0-9_]+$/;
// Можно явно задать источник через env: BROADCAST_BASE="users.tg_id"
const explicit = process.env.BROADCAST_BASE?.trim();

async function detectSource() {
  if (explicit) {
    const [t, c] = explicit.split('.');
    if (!t || !c || !SAFE.test(t) || !SAFE.test(c)) throw new Error('Bad BROADCAST_BASE');
    return { table: t, column: c };
  }
  // Ищем по всем таблицам подходящие колонки
  const { rows } = await db.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema='public'
      AND (column_name ILIKE '%tg%id%' OR column_name ILIKE '%telegram%id%' OR column_name ILIKE '%chat_id%')
  `);
  if (!rows.length) throw new Error('Не нашёл колонку с TG-ID. Укажи BROADCAST_BASE=table.column');
  // Небольшая эвристика: предпочитаем bigint/integer, затем text
  rows.sort((a,b) => {
    const score = (t:string)=> (t.includes('bigint')||t.includes('integer'))?0:1;
    return score(a.data_type).toString().localeCompare(score(b.data_type).toString());
  });
  const best = rows[0];
  if (!SAFE.test(best.table_name) || !SAFE.test(best.column_name)) throw new Error('Unsafe names');
  return { table: best.table_name, column: best.column_name };
}

async function main(){
  const src = await detectSource();
  console.log('Источник TG-ID:', `${src.table}.${src.column}`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS subscriptions(
      tg_id       bigint PRIMARY KEY,
      is_subscribed boolean NOT NULL DEFAULT true,
      opt_in_at   timestamptz
    )
  `);

  // Наполняем из исходной таблицы; берём только цифры
  const sql = `
    INSERT INTO subscriptions (tg_id)
    SELECT DISTINCT (NULLIF(regexp_replace(${src.table}."${src.column}"::text, '\\D', '', 'g'), '')::bigint)
    FROM ${src.table}
    WHERE ${src.table}."${src.column}" IS NOT NULL
      AND regexp_replace(${src.table}."${src.column}"::text, '\\D', '', 'g') ~ '^[0-9]+$'
    ON CONFLICT (tg_id) DO NOTHING
  `;
  await db.query(sql);

  await db.query(`CREATE OR REPLACE VIEW v_broadcast_targets AS
    SELECT tg_id, is_subscribed FROM subscriptions WHERE is_subscribed = true
  `);

  const { rows: [{ cnt }] } = await db.query(`SELECT count(*)::int AS cnt FROM v_broadcast_targets`);
  console.log('Готово. Подписчиков сейчас:', cnt);
  await db.end();
}

main().catch(e=>{ console.error(e); process.exit(1); });
