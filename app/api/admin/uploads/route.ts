// ==============================================================
// FEATURE: Image upload as a file (no external URL needed)
// ==============================================================
// This adds an upload endpoint that saves images to Supabase Storage
// (bucket: `broadcasts` by default) and returns a public URL. The admin UI
// gets a file input that auto-uploads and fills the Image URL field.

// ==============================================================
// FILE: app/api/admin/uploads/route.ts
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

export async function POST(req: Request) {
  const unauth = assertAdmin(req); if (unauth) return unauth
  const supa = createServerClient()

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ ok: false, error: 'file is required' }, { status: 400 })

  const maxMb = Number(process.env.BROADCAST_IMAGE_MAX_MB || 8)
  if (file.size > maxMb * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: `file too large > ${maxMb}MB` }, { status: 413 })
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
}