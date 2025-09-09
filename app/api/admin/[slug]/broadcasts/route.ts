
// app/api/admin/[slug]/broadcasts/route.ts
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { assertBotAdmin } from '@/app/api/_adminAuth'

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const unauth = assertBotAdmin(req, params.slug); if (unauth) return unauth
  const supa = createServerClient()
  const { data: bot } = await supa.from('bots').select('id').eq('slug', params.slug).maybeSingle()
  if (!bot) return NextResponse.json({ ok: false, error: 'bot not found' }, { status: 404 })
  const { data, error } = await supa.from('campaigns')
    .select('*').eq('bot_id', bot.id)
    .order('id', { ascending: false })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, items: data || [] })
}

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const unauth = assertBotAdmin(req, params.slug); if (unauth) return unauth
  const supa = createServerClient()
  const { data: bot } = await supa.from('bots').select('id').eq('slug', params.slug).maybeSingle()
  if (!bot) return NextResponse.json({ ok: false, error: 'bot not found' }, { status: 404 })

  const body = await req.json()
  const row = { ...body, bot_id: bot.id, state: 'draft' }
  const { data, error } = await supa.from('campaigns').insert(row).select('*').single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, item: data })
}


    const bucket = process.env.BROADCASTS_BUCKET || 'broadcasts'
    const ab = await file.arrayBuffer()
    const buf = Buffer.from(ab)
    const ext = (file.type?.split('/')?.[1]) || (file.name.split('.').pop() || 'bin')
    const prefix = (form.get('prefix') as string) || 'campaigns'
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { data: uploaded, error } = await supa.storage
      .from(bucket)
      .upload(path, buf, { contentType: file.type || 'application/octet-stream', upsert: false })
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    const { data: pub } = supa.storage.from(bucket).getPublicUrl(uploaded.path)
    return NextResponse.json({ ok: true, url: pub.publicUrl, path: uploaded.path })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}