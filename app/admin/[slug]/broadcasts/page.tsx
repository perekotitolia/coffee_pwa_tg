'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'

type AudienceFilters = {
  sources?: ('profiles' | 'customers')[]
  marketing_only?: boolean
  min_points?: number
  last_active_days?: number
  shop_ids?: string[]
  include_tg_ids?: number[]
  exclude_tg_ids?: number[]
}

export default function Page() {
  const { slug } = useParams<{ slug: string }>()
  const slugStr = String(slug)
  const LS_KEY = `ADMIN_API_KEY__${slugStr.toUpperCase()}`

  // ------------ helpers bound to slug ---------------------------------------
  function adminHeaders() {
    if (typeof window === 'undefined') return {}
    return { 'x-admin-key': localStorage.getItem(LS_KEY) || '' }
  }

  async function apiJSON<T = any>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = { ...(init?.headers as any), ...adminHeaders() }
    // ставим content-type только если есть body и не FormData
    const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData
    if (init?.body && !isFormData) headers['content-type'] = headers['content-type'] || 'application/json'

    const res = await fetch(`/api/admin/${slugStr}${path}`, { ...init, headers })
    let data: any = null
    try { data = await res.json() } catch { /* пустой ответ — ок */ }
    if (!res.ok || (data && data.ok === false)) {
      throw new Error(data?.error || res.statusText)
    }
    return (data ?? {}) as T
  }

  async function uploadFileToStorage(file: File): Promise<string> {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`/api/admin/${slugStr}/uploads`, {
      method: 'POST',
      headers: { ...adminHeaders() },
      body: fd,
    })
    const data = await res.json()
    if (!res.ok || data?.ok === false) throw new Error(data?.error || res.statusText)
    return data.url as string
  }

  // ------------ state --------------------------------------------------------
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
      sources: [sources.profiles && 'profiles', sources.customers && 'customers'].filter(Boolean) as (
        | 'profiles'
        | 'customers'
      )[],
      marketing_only: marketingOnly,
      min_points: minPoints || undefined,
      last_active_days: lastActiveDays || undefined,
    }),
    [sources, marketingOnly, minPoints, lastActiveDays],
  )

  const [campId, setCampId] = useState<number | undefined>()
  const [snapshotCount, setSnap] = useState<number | undefined>()
  const [status, setStatus] = useState<{ ok: true; total: number; sent: number; blocked: number; failed: number } | undefined>()
  const [busy, setBusy] = useState(false)
  const [adminKeyInput, setAdminKeyInput] = useState<string>(
    typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) || '' : '',
  )

  useEffect(() => {
    const t = setInterval(async () => {
      if (!campId) return
      try {
        const s = await apiJSON<{ ok: true; total: number; sent: number; blocked: number; failed: number }>(
          `/broadcasts/${campId}/status`,
        )
        setStatus(s)
      } catch {
        /* endpoint может отсутствовать — не критично */
      }
    }, 2000)
    return () => clearInterval(t)
  }, [campId])

  // ------------ actions ------------------------------------------------------
  async function createCampaign() {
    setBusy(true)
    try {
      const r = await apiJSON<{ ok: true; item?: { id: number }; id?: number }>(`/broadcasts`, {
        method: 'POST',
        body: JSON.stringify({
          title,
          body,
          image_url: imageUrl || undefined,
          button_text: buttonText || undefined,
          button_url: buttonUrl || undefined,
          filters,
        }),
      })
      const id = r.item?.id ?? r.id
      if (!id) throw new Error('no id returned')
      setCampId(id)
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
      const r = await apiJSON<{ ok: true; total: number }>(`/broadcasts/${campId}/snapshot`, { method: 'POST' })
      setSnap(r.total)
    } catch (e: any) {
      alert(`Snapshot error: ${e.message || e}`)
    } finally {
      setBusy(false)
    }
  }

  async function start() {
    if (!campId) return
    setBusy(true)
    try {
      await apiJSON<{ ok: true; queued: number }>(`/broadcasts/${campId}/start`, { method: 'POST' })
    } catch (e: any) {
      alert(`Start error: ${e.message || e}`)
    } finally {
      setBusy(false)
    }
  }

  async function drain() {
    if (!campId) return
    setBusy(true)
    try {
      await apiJSON<{ ok: true; processed: number; left: number }>(`/broadcasts/${campId}/drain`, { method: 'POST' })
    } catch (e: any) {
      alert(`Drain error: ${e.message || e}`)
    } finally {
      setBusy(false)
    }
  }

  // ------------ UI -----------------------------------------------------------
  const preview = useMemo(
    () => ({
      title: title?.trim(),
      body: body?.trim(),
      image: imageUrl?.trim(),
      button: buttonText?.trim() && buttonUrl?.trim() ? { text: buttonText.trim(), url: buttonUrl.trim() } : null,
    }),
    [title, body, imageUrl, buttonText, buttonUrl],
  )

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">📣 Рассылки — {slugStr}</h1>

      <section className="space-y-2">
        <label className="block text-sm">ADMIN API KEY (saved locally for {slugStr})</label>
        <div className="flex gap-2">
          <input
            className="w-full p-2 rounded border"
            placeholder="paste admin key"
            value={adminKeyInput}
            onChange={(e) => setAdminKeyInput(e.target.value)}
          />
          <button
            className="px-3 py-2 rounded border"
            onClick={() => typeof window !== 'undefined' && localStorage.setItem(LS_KEY, adminKeyInput)}
          >
            Save
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <input
          className="w-full p-2 rounded border"
          placeholder="Заголовок (необязательно)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full p-2 rounded border h-40"
          placeholder="Текст сообщения (Markdown/HTML)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3 items-start">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="URL картинки (опц.)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="flex-1 p-2 rounded border"
            />
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const input = e.currentTarget
                const file = input?.files?.[0]
                if (!file) return
                try {
                  setBusy(true)
                  const uploadedUrl = await uploadFileToStorage(file)
                  setImageUrl(uploadedUrl)
                } catch (err: any) {
                  alert(`Upload error: ${err?.message || err}`)
                } finally {
                  setBusy(false)
                  if (input) input.value = ''
                }
              }}
            />
          </div>

          <input
            className="p-2 rounded border"
            placeholder="Текст кнопки (опц.)"
            value={buttonText}
            onChange={(e) => setButtonText(e.target.value)}
          />
          <input
            className="p-2 rounded border col-span-2"
            placeholder="URL кнопки (опц.)"
            value={buttonUrl}
            onChange={(e) => setButtonUrl(e.target.value)}
          />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">🎯 Фильтры</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={sources.profiles}
              onChange={(e) => setSources((s) => ({ ...s, profiles: e.target.checked }))}
            />
            profiles
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={sources.customers}
              onChange={(e) => setSources((s) => ({ ...s, customers: e.target.checked }))}
            />
            customers
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={marketingOnly} onChange={(e) => setMarketing(e.target.checked)} />
            только marketing_opt_in
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            Мин. поинтов
            <input
              type="number"
              className="w-full p-2 rounded border"
              value={minPoints}
              onChange={(e) => setMinPoints(Number(e.target.value))}
            />
          </label>
          <label className="text-sm">
            Активность за N дней
            <input
              type="number"
              className="w-full p-2 rounded border"
              value={lastActiveDays}
              onChange={(e) => setDays(Number(e.target.value))}
            />
          </label>
        </div>
      </section>

      <section className="flex gap-3">
        <button className="px-4 py-2 rounded bg-black text-white disabled:opacity-50" onClick={createCampaign} disabled={busy}>
          Сохранить кампанию
        </button>
        <button
          className="px-4 py-2 rounded bg-slate-800 text-white disabled:opacity-50"
          onClick={snapshot}
          disabled={!campId || busy}
        >
          Снимок аудитории
        </button>
        <button
          className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-50"
          onClick={start}
          disabled={!campId || !snapshotCount || busy}
        >
          Старт
        </button>
        <button className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50" onClick={drain} disabled={!campId || busy}>
          Drain
        </button>
      </section>

      <section className="grid grid-cols-2 gap-6">
        <article className="p-4 border rounded">
          <h3 className="font-medium mb-2">🧪 Preview</h3>
          {preview.image && <img src={preview.image} alt="preview" className="rounded mb-3" />}
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
    </main>
  )
}
