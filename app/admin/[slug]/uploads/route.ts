export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { assertBotAdmin } from '@/app/api/_adminAuth'

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const unauth = assertBotAdmin(req, params.slug); if (unauth) return unauth
  const supa = createServerClient()

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ ok: false, error: 'file is required' }, { status: 400 })

  const bucket = process.env.BROADCASTS_BUCKET || 'broadcasts'
  const ab = await file.arrayBuffer()
  const buf = Buffer.from(ab)
  const ext = (file.type?.split('/')?.[1]) || (file.name.split('.').pop() || 'bin')
  const path = `campaigns/${params.slug}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { data: uploaded, error } = await supa.storage.from(bucket).upload(path, buf, {
    contentType: file.type || 'application/octet-stream', upsert: false
  })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const { data: pub } = supa.storage.from(bucket).getPublicUrl(uploaded.path)
  return NextResponse.json({ ok: true, url: pub.publicUrl, path: uploaded.path })
}
