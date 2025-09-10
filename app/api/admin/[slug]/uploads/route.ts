export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { assertBotAdmin } from '@/app/api/_adminAuth'

export async function POST(req: Request, context: any) {
  const slug = String(context?.params?.slug ?? '')
  const unauth = assertBotAdmin(req, slug); if (unauth) return unauth

  const supa = createServerClient()

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ ok: false, error: 'file is required' }, { status: 400 })

  const maxMb = Number(process.env.BROADCAST_IMAGE_MAX_MB || 8)
  if (file.size > maxMb * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: `file too large > ${maxMb}MB` }, { status: 413 })
  }

  const bucket = process.env.BROADCASTS_BUCKET || 'broadcasts'
  const bytes = Buffer.from(await file.arrayBuffer())
  const ext = (file.type?.split('/')?.[1]) || (file.name.split('.').pop() || 'bin')
  const path = `campaigns/${slug}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { data: uploaded, error } = await supa.storage
    .from(bucket)
    .upload(path, bytes, { contentType: file.type || 'application/octet-stream', upsert: false })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const { data: pub } = supa.storage.from(bucket).getPublicUrl(uploaded.path)
  return NextResponse.json({ ok: true, url: pub.publicUrl, path: uploaded.path })
}
