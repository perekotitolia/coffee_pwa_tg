'use client'

// Broadcast Admin page (Next.js /app/admin/broadcasts/page.tsx)
// Fix: Next.js pages cannot have arbitrary named exports. Removed all `export`ed
// helpers/types/constants to satisfy the Page type checker.

import React, { useEffect, useMemo, useState } from 'react'

// ---- Types & helpers -------------------------------------------------------
// NOTE: Do not export anything from a Page file. Keep helpers local or move to /lib.

type AudienceFilters = {
  sources?: ("profiles" | "customers")[]
  marketing_only?: boolean
  min_points?: number
  last_active_days?: number
  shop_ids?: string[]
  include_tg_ids?: number[]
  exclude_tg_ids?: number[]
}

function sanitizeTgId(x: unknown): number | null {
  if (x == null) return null
  const digits = String(x).replace(/\D/g, '')
  if (!digits) return null
  const n = Number(digits)
  return Number.isFinite(n) ? n : null
}

function chunk<T>(arr: T[], n = 1000): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

// Simple runtime tests (executed once in browser) to ensure helpers behave.
if (typeof window !== 'undefined' && !(window as any).__BCAST_HELPER_TESTED__) {
  (window as any).__BCAST_HELPER_TESTED__ = true
  // sanitizeTgId tests
  console.assert(sanitizeTgId('123') === 123, 'sanitizeTgId simple digits')
  console.assert(sanitizeTgId('+1 23-45') === 12345, 'sanitizeTgId strips non-digits')
  console.assert(sanitizeTgId('abc') === null, 'sanitizeTgId returns null if no digits')
  console.assert(sanitizeTgId(null) === null, 'sanitizeTgId null -> null')
  // chunk tests
  console.assert(JSON.stringify(chunk([1,2,3,4,5], 2)) === JSON.stringify([[1,2],[3,4],[5]]), 'chunk size=2 works')
  console.assert(chunk([], 3).length === 0, 'chunk empty array')
}

// ---- Small fetch helper ----------------------------------------------------
const adminHeaders = () => ({
  'content-type': 'application/json',
  'x-admin-key': typeof window !== 'undefined' ? (localStorage.getItem('ADMIN_API_KEY') || '') : ''
})

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...(init || {}), headers: { ...adminHeaders(), ...(init?.headers || {}) } })
  const json = await res.json()
  if (!res.ok || json?.ok === false) throw new Error(json?.error || res.statusText)
  return json as T
}

// ---- UI --------------------------------------------------------------------
export default function BroadcastsPage() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [buttonText, setButtonText] = useState('')
  const [buttonUrl, setButtonUrl] = useState('')

  const [lastActiveDays, setDays] = useState(90)
  const [minPoints, setMinPoints] = useState(0)
  const [marketingOnly, setMarketing] = useState(true)
  const [sources, setSources] = useState<{ profiles: boolean; customers: boolean }>({ profiles: true, customers: true })

  const filters: AudienceFilters = useMemo(
    () => ({
      sources: [sources.profiles && 'profiles', sources.customers && 'customers'].filter(Boolean) as ('profiles'|'customers')[],
      marketing_only: marketingOnly,
      min_points: minPoints || undefined,
      last_active_days: lastActiveDays || undefined
    }),
    [sources, marketingOnly, minPoints, lastActiveDays]
  )

  const [campId, setCampId] = useState<number | undefined>()
  const [snapshotCount, setSnap] = useState<number | undefined>()
  const [status, setStatus] = useState<{ ok: true; total: number; sent: number; blocked: number; failed: number } | undefined>()
  const [busy, setBusy] = useState(false)
  const [adminKeyInput, setAdminKeyInput] = useState<string>(typeof window !== 'undefined' ? (localStorage.getItem('ADMIN_API_KEY') || '') : '')

  useEffect(() => {
    const t = setInterval(async () => {
      if (!campId) return
      try {
        const s = await api<{ ok: true; total: number; sent: number; blocked: number; failed: number }>(`/api/admin/broadcasts/${campId}/status`)
        setStatus(s)
      } catch { /* ignore until endpoints exist */ }
    }, 2000)
    return () => clearInterval(t)
  }, [campId])

  async function createCampaign() {
    setBusy(true)
    try {
      const r = await api<{ ok: true; id: number }>(`/api/admin/broadcasts`, {
        method: 'POST',
        body: JSON.stringify({ title, body, image_url: imageUrl || undefined, button_text: buttonText || undefined, button_url: buttonUrl || undefined, filters })
      })
      setCampId(r.id)
    } catch (e: any) {
      alert(`Create error: ${e.message || e}`)
    } finally {
      setBusy(false)
    }
  }

  async function snapshot() {
    if (!campId) return
    setBusy(true)
    try {
      const r = await api<{ ok: true; total: number }>(`/api/admin/broadcasts/${campId}/snapshot`, { method: 'POST' })
      setSnap(r.total)
    } catch (e: any) {
      alert(`Snapshot error: ${e.message || e}`)
    } finally { setBusy(false) }
  }

  async function start() {
    if (!campId) return
    setBusy(true)
    try {
      await api<{ ok: true; queued: number }>(`/api/admin/broadcasts/${campId}/start`, { method: 'POST' })
    } catch (e: any) {
      alert(`Start error: ${e.message || e}`)
    } finally { setBusy(false) }
  }

  async function drain() {
    if (!campId) return
    setBusy(true)
    try {
      await api<{ ok: true; processed: number; left: number }>(`/api/admin/broadcasts/${campId}/drain`, { method: 'POST' })
    } catch (e: any) {
      alert(`Drain error: ${e.message || e}`)
    } finally { setBusy(false) }
  }

  const preview = useMemo(() => ({
    title: title?.trim(),
    body: body?.trim(),
    image: imageUrl?.trim(),
    button: buttonText?.trim() && buttonUrl?.trim() ? { text: buttonText.trim(), url: buttonUrl.trim() } : null
  }), [title, body, imageUrl, buttonText, buttonUrl])

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">📣 Рассылки</h1>

      <section className="space-y-2">
        <label className="block text-sm">ADMIN_API_KEY (stored locally)</label>
        <div className="flex gap-2">
          <input
            className="w-full p-2 rounded border"
            placeholder="paste admin key"
            value={adminKeyInput}
            onChange={(e) => setAdminKeyInput(e.target.value)}
            onBlur={() => typeof window !== 'undefined' && localStorage.setItem('ADMIN_API_KEY', adminKeyInput)}
          />
          <button className="px-3 py-2 rounded border" onClick={() => typeof window !== 'undefined' && localStorage.setItem('ADMIN_API_KEY', adminKeyInput)}>Save</button>
        </div>
      </section>

      <section className="space-y-3">
        <input className="w-full p-2 rounded border" placeholder="Заголовок (необязательно)" value={title} onChange={e=>setTitle(e.target.value)} />
        <textarea className="w-full p-2 rounded border h-40" placeholder="Текст сообщения (Markdown/HTML)" value={body} onChange={e=>setBody(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <input className="p-2 rounded border" placeholder="URL картинки (опц.)" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} />
          <input className="p-2 rounded border" placeholder="Текст кнопки (опц.)" value={buttonText} onChange={e=>setButtonText(e.target.value)} />
          <input className="p-2 rounded border col-span-2" placeholder="URL кнопки (опц.)" value={buttonUrl} onChange={e=>setButtonUrl(e.target.value)} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">🎯 Фильтры</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2"><input type="checkbox" checked={sources.profiles} onChange={e=>setSources(s=>({...s, profiles: e.target.checked}))}/>profiles</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={sources.customers} onChange={e=>setSources(s=>({...s, customers: e.target.checked}))}/>customers</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={marketingOnly} onChange={e=>setMarketing(e.target.checked)}/>только marketing_opt_in</label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">Мин. поинтов
            <input type="number" className="w-full p-2 rounded border" value={minPoints} onChange={e=>setMinPoints(Number(e.target.value))} />
          </label>
          <label className="text-sm">Активность за N дней
            <input type="number" className="w-full p-2 rounded border" value={lastActiveDays} onChange={e=>setDays(Number(e.target.value))} />
          </label>
        </div>
      </section>

      <section className="flex gap-3">
        <button className="px-4 py-2 rounded bg-black text-white disabled:opacity-50" onClick={createCampaign} disabled={busy}>Сохранить кампанию</button>
        <button className="px-4 py-2 rounded bg-slate-800 text-white disabled:opacity-50" onClick={snapshot} disabled={!campId || busy}>Снимок аудитории</button>
        <button className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-50" onClick={start} disabled={!campId || !snapshotCount || busy}>Старт</button>
        <button className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50" onClick={drain} disabled={!campId || busy}>Drain</button>
      </section>

      <section className="grid grid-cols-2 gap-6">
        <article className="p-4 border rounded">
          <h3 className="font-medium mb-2">🧪 Preview</h3>
          {preview.image && (<img src={preview.image} alt="preview" className="rounded mb-3" />)}
          <div className="whitespace-pre-wrap text-sm">{preview.body || '— пусто —'}</div>
          {preview.button && (
            <a className="inline-block mt-3 px-3 py-2 rounded bg-sky-600 text-white" href={preview.button.url} target="_blank" rel="noreferrer">
              {preview.button.text}
            </a>
          )}
        </article>
        <article className="p-4 border rounded text-sm text-slate-600">
          <h3 className="font-medium mb-2">📊 Статус</h3>
          <div>campaign_id: {campId ?? '—'}</div>
          <div>snapshot: {snapshotCount ?? '—'}</div>
          <div>status: {status ? `total:${status.total} sent:${status.sent} blocked:${status.blocked} failed:${status.failed}` : '—'}</div>
        </article>
      </section>

      {/* Developer helper: SQL migration as a string constant (copy when needed) */}
      <details className="mt-6">
        <summary className="cursor-pointer select-none">🔧 Show SQL migration (copy & run in Supabase)</summary>
        <pre className="p-3 bg-slate-50 rounded overflow-auto text-xs">{SQL_MIGRATION}</pre>
      </details>
    </main>
  )
}

// Keep this as a local constant (no export) to comply with Next.js Page rules.
const SQL_MIGRATION = String.raw`-- campaigns
create table if not exists campaigns (
  id bigserial primary key,
  title text,
  body text not null,
  parse_mode text check (parse_mode in ('Markdown','HTML')) default 'Markdown',
  image_url text,
  button_text text,
  button_url text,
  created_at timestamptz default now(),
  created_by text,
  state text not null default 'draft'
);

create table if not exists campaign_segments (
  id bigserial primary key,
  campaign_id bigint references campaigns(id) on delete cascade,
  kind text not null default 'json',
  filters jsonb,
  where_sql text
);

create table if not exists campaign_recipients (
  id bigserial primary key,
  campaign_id bigint references campaigns(id) on delete cascade,
  tg_id bigint not null
);
create index if not exists idx_recips_campaign on campaign_recipients(campaign_id);

create table if not exists campaign_logs (
  id bigserial primary key,
  campaign_id bigint references campaigns(id) on delete cascade,
  tg_id bigint not null,
  status text not null,
  error text,
  created_at timestamptz default now()
);
create index if not exists idx_logs_campaign on campaign_logs(campaign_id);

-- audience views
create or replace view v_audience_profiles as
select
  p.tg_id::bigint as tg_id,
  p.points as points,
  coalesce(p.marketing_opt_in, true) as opt_in,
  (select max(pe.created_at) from points_events pe where pe.profile_id = p.id) as last_activity_at,
  (select t.shop_id from transactions t where t.customer_id = p.id order by t.created_at desc limit 1) as last_shop_id
from profiles p
where p.tg_id is not null;

create or replace view v_audience_customers as
select
  nullif(regexp_replace(c.tg_id, '\\D', '', 'g'), '')::bigint as tg_id,
  null::int4 as points,
  true as opt_in,
  (select max(t.created_at) from transactions t where t.customer_id = c.id) as last_activity_at,
  (select t.shop_id from transactions t where t.customer_id = c.id order by t.created_at desc limit 1) as last_shop_id
from customers c
where c.tg_id is not null;

create or replace view v_audience_all as
select * from v_audience_profiles
union
select * from v_audience_customers;
