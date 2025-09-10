import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

function randomToken(len = 24) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  crypto.getRandomValues(new Uint8Array(len)).forEach((n) => {
    out += chars[n % chars.length];
  });
  return out;
}

export async function POST(req: NextRequest) {
  const { deviceId } = await req.json();
  if (!deviceId)
    return NextResponse.json(
      { ok: false, error: "NO_DEVICE" },
      { status: 400 },
    );

  const sb = createServerClient();

  // Ensure profile exists
  const { data: prof, error } = await sb
    .from("profiles")
    .upsert({ device_id: deviceId }, { onConflict: "device_id" })
    .select()
    .maybeSingle();
  if (error || !prof)
    return NextResponse.json(
      { ok: false, error: "UPSERT_FAIL" },
      { status: 500 },
    );

  // (Re)issue a link token
  const token = randomToken();
  const { data: prof2, error: updErr } = await sb
    .from("profiles")
    .update({ link_token: token })
    .eq("id", prof.id)
    .select()
    .maybeSingle();
  if (updErr || !prof2)
    return NextResponse.json(
      { ok: false, error: "TOKEN_FAIL" },
      { status: 500 },
    );

  const bot = process.env.TELEGRAM_BOT_USERNAME || "your_bot";
  const url = `https://t.me/${bot}?start=link-${token}`;

  return NextResponse.json({ ok: true, url });
}
