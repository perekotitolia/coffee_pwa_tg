'use client'

import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { ProgressSix } from '@/components/ProgressSix'
import { LinkTelegramButton } from '@/components/LinkTelegramButton'

type Payload = {
  v: number
  type: 'user'
  deviceId: string
  iat: number
  exp: number
}

export default function MePage() {
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [dataUrl, setDataUrl] = useState<string>('')
  const [expiresIn, setExpiresIn] = useState<number>(0)
  const [progress, setProgress] = useState<number>(0)

  // Get deviceId only on client to avoid SSR/prerender crashes
  useEffect(() => {
    if (typeof window === 'undefined') return
    const key = 'coffee.deviceId'
    let id = window.localStorage.getItem(key)
    if (!id) {
      id = crypto.randomUUID()
      window.localStorage.setItem(key, id)
    }
    setDeviceId(id)
  }, [])

  // Optionally, load points from server
  useEffect(() => {
    async function load() {
      try { await fetch('/api/health') } catch {}
    }
    load()
  }, [])

  // Rotate QR every 45s (only when deviceId is ready)
  useEffect(() => {
    if (!deviceId) return
    let mounted = true
    let timer: any

    const rotate = async () => {
      const now = Math.floor(Date.now() / 1000)
      const payload: Payload = { v: 1, type: 'user', deviceId, iat: now, exp: now + 45 }
      const text = JSON.stringify(payload)
      const url = await QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin: 1, scale: 6 })
      if (!mounted) return
      setDataUrl(url)
      setExpiresIn(payload.exp - now)
    }

    rotate()
    timer = setInterval(rotate, 45_000)
    const tick = setInterval(() => setExpiresIn(x => Math.max(0, x - 1)), 1000)

    return () => { mounted = false; clearInterval(timer); clearInterval(tick) }
  }, [deviceId])

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">Мій QR</h1>
      <div className="card flex flex-col md:flex-row items-center gap-6">
        <img
          src={dataUrl || '/icons/maskable-512.png'}
          alt="QR"
          className="w-64 h-64 rounded-xl bg-white p-2"
        />
        <div className="space-y-3 w-full">
          <div className="text-sm text-zinc-400">Оновлення через: {expiresIn}s</div>
          <div className="space-y-1">
            <div className="text-sm text-zinc-300">Прогрес до «БЕЗКОШТОВНА КАВА»</div>
            <ProgressSix filled={progress} />
          </div>
          {deviceId && <LinkTelegramButton deviceId={deviceId} />}
        </div>
      </div>
      <p className="text-zinc-400 text-sm">
        Покажіть цей QR продавцю для нарахування балів.
      </p>
    </main>
  )
}