'use client'

export function ProgressSix({ filled = 0 }: { filled?: number }) {
  const n = Math.max(0, Math.min(6, filled))
  return (
    <div className="flex gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={`w-6 h-6 rounded-full border transition ${
            i < n ? 'bg-emerald-500 border-emerald-400' : 'bg-transparent border-zinc-600'
          }`}
          title={`${i < n ? 'filled' : 'empty'}`}
        />
      ))}
    </div>
  )
}