'use client'

import { Html5QrcodeScanner } from 'html5-qrcode'
import { useEffect, useRef } from 'react'

export function Scanner({ onCode }: { onCode: (text: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const scanner = new Html5QrcodeScanner(ref.current.id, { fps: 10, qrbox: 250 }, false)
    scanner.render(
      (decoded) => {
        onCode(decoded)
      },
      (err) => { /* ignore */ }
    )
    return () => {
      try { scanner.clear() } catch {}
    }
  }, [onCode])

  return (
    <div className="space-y-2">
      <div id="qr-scanner" ref={ref} className="rounded-xl overflow-hidden" />
      <div className="text-sm text-zinc-400">
        Наведіть камеру на QR з екрану покупця.
      </div>
    </div>
  )
}