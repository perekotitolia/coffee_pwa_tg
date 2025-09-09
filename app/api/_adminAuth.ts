// app/api/_adminAuth.ts (утилита)
import { NextResponse } from 'next/server'

export function assertBotAdmin(req: Request, slug: string) {
  const incoming = req.headers.get('x-admin-key') || ''
  const global = process.env.ADMIN_API_KEY || ''
  const perBot = process.env[`ADMIN_API_KEY__${slug.toUpperCase()}`] || ''
  if (incoming && (incoming === global || (perBot && incoming === perBot))) return null
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
}
