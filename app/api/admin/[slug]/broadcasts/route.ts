// app/api/admin/[slug]/broadcasts/route.ts
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { assertBotAdmin } from '@/app/api/_adminAuth' // как мы делали ранее

// GET: список кампаний данного бота
export async function GET(req: Request, context: { params: { slug: string } }) {
  const unauth = assertBotAdmin(req, context.params.slug); if (unauth) return unauth
  const supa = createServerClient()

  const { data: bot } = await supa.from('bots').select('id').eq('slug', context.params.slug).maybeSingle()
  if (!bot) return NextResponse.json({ ok: false, error: 'bot not found' }, { status: 404 })

  const { data, error } = await supa
    .from('campaigns')
    .select('*')
    .eq('bot_id', bot.id)
    .order('id', { ascending: false })

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, items: data ?? [] })
}

// POST: создать кампанию для бота (bot_id берём по slug)
export async function POST(req: Request, context: { params: { slug: string } }) {
  const unauth = asser


 