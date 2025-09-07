// ==============================================================
// FILE: app/api/admin/broadcasts/route.ts
// ==============================================================
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'

function assertAdmin(req: Request) {
  const key = process.env.ADMIN_API_KEY
  if (!key || req.headers.get('x-admin-key') !== key) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  return null
}

export async function GET(req: Request) {
  const unauth = assertAdmin(req); if (unauth) return unauth
  const supa = createServerClient()
  const { data, error } = await supa.from('campaigns').select('*').order('id', { ascending: false })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, items: data })
}

export async function POST(req: Request) {
  const unauth = assertAdmin(req); if (unauth) return unauth
  const supa = createServerClient()

  const body = await req.json()
  const { title, body: text, parse_mode, image_url, button_text, button_url, filters } = body || {}
  if (!text) return NextResponse.json({ ok: false, error: 'body is required' }, { status: 400 })

  // IMPORTANT: don't set created_by='admin' — in your DB this column is UUID.
  // Just omit it (or pass null) to avoid "invalid input syntax for type uuid: 'admin'".
  const insertPayload: any = {
    title,
    body: text,
    parse_mode: parse_mode || 'Markdown',
    image_url: image_url || null,
    button_text: button_text || null,
    button_url: button_url || null,
    // created_by: null  // ← omit if column exists
  }

  const { data: c, error } = await supa.from('campaigns').insert(insertPayload).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  if (filters) {
    const { error: e2 } = await supa.from('campaign_segments').insert({ campaign_id: c.id, kind: 'json', filters })
    if (e2) return NextResponse.json({ ok: false, error: e2.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: c.id })
}
