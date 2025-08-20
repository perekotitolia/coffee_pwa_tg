import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const hasJWT = !!process.env.JWT_SECRET;
  const hasUpstashUrl = !!process.env.UPSTASH_REDIS_REST_URL;
  const hasUpstashToken = !!process.env.UPSTASH_REDIS_REST_TOKEN;
  return NextResponse.json({ hasJWT, hasUpstashUrl, hasUpstashToken });
}