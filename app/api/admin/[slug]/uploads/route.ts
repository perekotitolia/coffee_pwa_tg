// ==============================================================
// FILE: app/api/admin/[slug]/uploads/route.ts
// ==============================================================
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { assertBotAdmin } from '@/app/api/_adminAuth';

export async function POST(req: Request, ctx: any) {
  // берем slug из ctx (а не "context")
  const slug = String(ctx?.params?.slug ?? '');

  // проверка админ-ключа для именно этого бота
  const unauth = assertBotAdmin(req, slug);
  if (unauth) return unauth;

  try {
    const form = await req.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: 'file is required (multipart/form-data, field name "file")' },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());

    const supa = createServerClient();

    // ⚠️ Проверь, что такой bucket есть в Supabase и он публичный.
    const bucket = 'uploads';
    // Путь хранения: /<slug>/broadcasts/<timestamp>_<originalName>
    const safeName = (file.name || 'image').replace(/[^\w.\-]+/g, '_');
    const path = `${slug}/broadcasts/${Date.now()}_${safeName}`;

    const { data: uploaded, error } = await supa.storage
      .from(bucket)
      .upload(path, buf, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // получить публичную ссылку
    const pub = supa.storage.from(bucket).getPublicUrl(uploaded.path);
    const url = pub?.data?.publicUrl;

    if (!url) {
      return NextResponse.json(
        { ok: false, error: 'failed to get public url from storage' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, url, path: uploaded.path });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
