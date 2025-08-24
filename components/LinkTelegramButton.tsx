'use client'

export function LinkTelegramButton({ deviceId }: { deviceId: string }) {
  async function handle() {
    const res = await fetch('/api/tg/create-link', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ deviceId })
    })
    const json = await res.json()
    if (json?.ok && json.url) {
      window.open(json.url, '_blank', 'noopener,noreferrer')
    } else {
      alert('Помилка створення посилання')
    }
  }

  return (
    <button className="btn" onClick={handle}>
      Привʼязати Telegram
    </button>
  )
}