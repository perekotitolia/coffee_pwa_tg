'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

// ---------------- Types ----------------
type AudienceFilters = {
  sources?: ('profiles' | 'customers')[];
  marketing_only?: boolean;
  min_points?: number;
  last_active_days?: number;
  shop_ids?: string[];
  include_tg_ids?: number[];
  exclude_tg_ids?: number[];
};

type Status = { ok: true; total: number; sent: number; blocked: number; failed: number };

// ---------------- Page ----------------
export default function Page() {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug || '').trim();
  const LS_KEY = `ADMIN_API_KEY__${slug.toUpperCase()}`;

  // form
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');

  // filters
  const [sources, setSources] = useState<{ profiles: boolean; customers: boolean }>({
    profiles: true,
    customers: true,
  });
  const [marketingOnly, setMarketing] = useState(true);
  const [minPoints, setMinPoints] = useState(0);
  const [lastActiveDays, setLastActiveDays] = useState(90);

  // admin key (персонально на slug)
  const [adminKey, setAdminKey] = useState<string>('');

  // campaign
  const [campId, setCampId] = useState<number | undefined>();
  const [snapshotCount, setSnapshotCount] = useState<number | undefined>();
  const [status, setStatus] = useState<Status | undefined>();
  const [busy, setBusy] = useState(false);

  // инициализация ключа из LS
  useEffect(() => {
    if (!slug) return;
    const saved = localStorage.getItem(LS_KEY) ?? localStorage.getItem('ADMIN_API_KEY') ?? '';
    setAdminKey(saved);
  }, [slug]);

  // небольшой хелпер, чтобы TS не ругался на headers
  const adminHeaders = (): HeadersInit => ({ 'x-admin-key': adminKey ?? '' });

  // универсальный fetch-хелпер под текущий slug
  async function apiJSON<T = any>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`/api/admin/${slug}${path}`, {
      ...init,
      headers: { ...(init?.headers || {}), ...adminHeaders() },
    });
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      /* тело могло быть пустым */
    }
    if (!res.ok || (data && data.ok === false)) {
      throw new Error(data?.error || res.statusText);
    }
    return (data ?? {}) as T;
  }

  // загрузка файла картинки в сторедж
  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    try {
      setBusy(true);
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/admin/${slug}/uploads`, {
        method: 'POST',
        headers: adminHeaders(),
        body: fd,
      });
      let json: any;
      try {
        json = await res.json();
      } catch {
        json = { ok: false, error: await res.text() };
      }
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || res.statusText);
      }
      setImageUrl((json as { ok: true; url: string }).url);
    } catch (err: any) {
      alert(`Upload error: ${err?.message || err}`);
    } finally {
      setBusy(false);
      // очистим input, чтобы можно было выбрать тот же файл повторно
      e.currentTarget.value = '';
    }
  }

  // сбор фильтров
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
  );

  // поллинг статуса
  useEffect(() => {
    if (!campId) return;
    const t = setInterval(async () => {
      try {
        const s = await apiJSON<Status>(`/broadcasts/${campId}/status`);
        setStatus(s);
      } catch {
        /* ignore */
      }
    }, 2000);
    return () => clearInterval(t);
  }, [campId]);

  // действия
  async function createCampaign() {
    setBusy(true);
    try {
      const r = await apiJSON<{ ok: true; id: number }>(`/broadcasts`, {
        method: 'POST',
        body: JSON.stringify({
          title: title || undefined,
          body,
          image_url: imageUrl || undefined,
          button_text: buttonText || undefined,
          button_url: buttonUrl || undefined,
          filters,
        }),
      });
      setCampId(r.id);
    } catch (e: any) {
      alert(`Create error: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  async function snapshot() {
    if (!campId) return;
    setBusy(true);
    try {
      const r = await apiJSON<{ ok: true; total: number }>(`/broadcasts/${campId}/snapshot`, { method: 'POST' });
      setSnapshotCount(r.total);
    } catch (e: any) {
      alert(`Snapshot error: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    if (!campId || !snapshotCount) return;
    setBusy(true);
    try {
      await apiJSON<{ ok: true; queued: number }>(`/broadcasts/${campId}/start`, { method: 'POST' });
    } catch (e: any) {
      alert(`Start error: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  async function drain() {
    if (!campId) return;
    setBusy(true);
    try {
      await apiJSON<{ ok: true; processed: number; left: number }>(`/broadcasts/${campId}/drain`, { method: 'POST' });
    } catch (e: any) {
      alert(`Drain error: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  // предпросмотр
  const preview = useMemo(
    () => ({
      title: title?.trim(),
      body: body?.trim(),
      image: imageUrl?.trim(),
      button:
        buttonText?.trim() && buttonUrl?.trim()
          ? { text: buttonText.trim(), url: buttonUrl.trim() }
          : null,
    }),
    [title, body, imageUrl, buttonText, buttonUrl],
  );

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">📣 Рассылки для бота: {slug}</h1>

      {/* Admin key */}
      <section className="space-y-2">
        <label className="block text-sm">ADMIN_API_KEY (localStorage)</label>
        <div className="flex gap-2">
          <input
            className="w-full p-2 rounded border"
            placeholder="вставь ключ админа"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
          />
          <button
            className="px-3 py-2 rounded border"
            onClick={() => localStorage.setItem(LS_KEY, adminKey)}
          >
            Save
          </button>
        </div>
      </section>

      {/* Form */}
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
            <input type="file" accept="image/*" onChange={handleImageFile} />
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

      {/* Filters */}
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
            <input
              type="checkbox"
              checked={marketingOnly}
              onChange={(e) => setMarketing(e.target.checked)}
            />
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
              onChange={(e) => setLastActiveDays(Number(e.target.value))}
            />
          </label>
        </div>
      </section>

      {/* Actions */}
      <section className="flex gap-3">
        <button
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          onClick={createCampaign}
          disabled={busy}
        >
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
        <button
          className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50"
          onClick={drain}
          disabled={!campId || busy}
        >
          Drain
        </button>
      </section>

      {/* Preview / Status */}
      <section className="grid grid-cols-2 gap-6">
        <article className="p-4 border rounded">
          <h3 className="font-medium mb-2">🧪 Preview</h3>
          {preview.image && <img src={preview.image} alt="preview" className="rounded mb-3" />}
          <div className="whitespace-pre-wrap text-sm">{preview.body || '— пусто —'}</div>
          {preview.button && (
            <a
              className="inline-block mt-3 px-3 py-2 rounded bg-sky-600 text-white"
              href={preview.button.url}
              target="_blank"
              rel="noreferrer"
            >
              {preview.button.text}
            </a>
          )}
        </article>

        <article className="p-4 border rounded text-sm text-slate-600">
          <h3 className="font-medium mb-2">📊 Статус</h3>
          <div>campaign_id: {campId ?? '—'}</div>
          <div>snapshot: {snapshotCount ?? '—'}</div>
          <div>
            status:{' '}
            {status
              ? `total:${status.total} sent:${status.sent} blocked:${status.blocked} failed:${status.failed}`
              : '—'}
          </div>
        </article>
      </section>
    </main>
  );
}
