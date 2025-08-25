'use client'

import { useCallback, useState } from 'react'
import { Scanner } from '@/components/Scanner'

type GrantResponse = {
  ok: boolean
  error?: string
  points?: number
}

export default function AdminPage() {
  const [lastCode, setLastCode] = useState<string>('')
  const [result, setResult] = useState<string>('')

  const onScan = useCallback(async (text: string) => {
    setLastCode(text)
    try {
      const res = await fetch('/api/points/grant', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ code: text, reason: 'coffee' })
      })
      const json: GrantResponse = await res.json()
      if (json.ok) {
        setResult(`✅ Начислено. Новый баланс: ${json.points}`)
      } else {
        setResult(`⚠️ ${json.error || 'Ошибка'}`)
      }
    } catch (e: any) {
      setResult('⚠️ Сеть: ' + e?.message)
    }
  }, [])

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">Панель продавця</h1>
      <div className="card space-y-3">
        <Scanner onCode={onScan} />
        <div className="text-sm text-zinc-400">Последний QR: <span className="text-zinc-200 break-all">{lastCode || '—'}</span></div>
        <div className="text-sm">{result}</div>
      </div>
      <a href="/admin/profiles" className="btn">Список акаунтів</a>
    </main>
  )
}