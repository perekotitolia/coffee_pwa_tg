import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="space-y-6">
      <h1 className="text-3xl font-bold">Coffee PWA</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card space-y-3">
          <h2 className="text-xl font-semibold">Клієнт</h2>
          <p className="text-zinc-300">Особистий QR, прогрес до «БЕЗКОШТОВНА КАВА», привʼязка Telegram.</p>
          <Link href="/me" className="btn">Відкрити /me</Link>
        </div>
        <div className="card space-y-3">
          <h2 className="text-xl font-semibold">Продавець</h2>
          <p className="text-zinc-300">Сканер QR та нарахування балів (демо-режим, без авторизації).</p>
          <Link href="/admin" className="btn">Відкрити /admin</Link>
        </div>
      </div>
      <div className="text-sm text-zinc-400">
        API: <code className="bg-zinc-800 px-2 py-1 rounded">/api/health</code>
      </div>
    </main>
  )
}