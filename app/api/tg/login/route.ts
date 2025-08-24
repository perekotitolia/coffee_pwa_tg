import { NextRequest, NextResponse } from 'next/server'
import { createHash, createHmac } from 'crypto'

function validateTelegramAuth(data: Record<string, string>) {
  const token = process.env.TELEGRAM_BOT_TOKEN!
  const secretKey = createHash('sha256').update(token).digest()
  const { hash, ...rest } = data
  const checkString = Object.keys(rest)
    .sort()
    .map(k => `${k}=${rest[k]}`)
    .join('\n')
  const hmac = createHmac('sha256', secretKey).update(checkString).digest('hex')
  return hmac === hash
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const ok = validateTelegramAuth(body)
  return NextResponse.json({ ok })
}