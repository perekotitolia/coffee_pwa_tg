export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabaseServer'

export default async function ProfilesListPage() {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('profiles')
    .select('id, created_at, device_id, tg_id, points, full_name, dob, marketing_opt_in')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">Акаунти</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-400">
              <th className="text-left p-2">Дата</th>
              <th className="text-left p-2">Ім’я</th>
              <th className="text-left p-2">DOB</th>
              <th className="text-left p-2">Device</th>
              <th className="text-left p-2">TG</th>
              <th className="text-left p-2">Баланс</th>
              <th className="text-left p-2">Opt-in</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((p) => (
              <tr key={p.id} className="border-t border-zinc-800">
                <td className="p-2">{new Date(p.created_at).toLocaleString()}</td>
                <td className="p-2">{p.full_name || '—'}</td>
                <td className="p-2">{p.dob || '—'}</td>
                <td className="p-2">{p.device_id || '—'}</td>
                <td className="p-2">{p.tg_id || '—'}</td>
                <td className="p-2">{p.points}</td>
                <td className="p-2">{p.marketing_opt_in ? '✅' : '⛔'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}