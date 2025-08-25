'use client'

import { Html5Qrcode } from 'html5-qrcode'
import { useEffect, useRef, useState } from 'react'

export function Scanner({
  onCode,
  preferredFacing = 'environment',
}: {
  onCode: (text: string) => void
  preferredFacing?: 'environment' | 'user'
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [facing, setFacing] = useState<'environment' | 'user'>(preferredFacing)

  useEffect(() => {
    if (!ref.current) return
    const elementId = ref.current.id
    const qr = new Html5Qrcode(elementId)

    const success = (decoded: string) => onCode(decoded)
    const failure = (_err: string) => {}

    async function startPreferred() {
      try {
        // 1) Пытаемся запросить нужную «сторону» через facingMode
        await qr.start({ facingMode: { exact: facing } }, { fps: 10, qrbox: 250 }, success, failure)
      } catch {
        // 2) Фоллбек: выбираем камеру по списку устройств
        const cams = await Html5Qrcode.getCameras()
        const rx = facing === 'environment' ? /back|rear|environment/i : /front|user/i
        const picked = cams.find(c => rx.test(c.label))?.id || cams[0]?.id
        if (!picked) throw new Error('No camera found')
        await qr.start(picked, { fps: 10, qrbox: 250 }, success, failure)
      }
    }

    startPreferred()

    return () => {
      try {
        qr.stop().then(() => qr.clear()).catch(() => {})
      } catch {}
    }
  }, [onCode, facing])

  return (
    <div className="space-y-2">
      <div id="qr-scanner" ref={ref} className="rounded-xl overflow-hidden" />
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <span>Камера: {facing === 'environment' ? 'задняя' : 'фронтальная'}</span>
        <button
          type="button"
          className="btn"
          onClick={() => setFacing(facing === 'environment' ? 'user' : 'environment')}
        >
          Переключить
        </button>
      </div>
    </div>
  )
}