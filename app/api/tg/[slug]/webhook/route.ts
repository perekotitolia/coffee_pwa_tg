// app/api/tg/[slug]/webhook/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { makeTg } from "@/lib/tg";

// валидация секрета из заголовка Telegram
async function resolveBot(
  supa: ReturnType<typeof createServerClient>,
  slug: string,
  req: Request,
) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token") || "";
  const { data: bot } = await supa
    .from("bots")
    .select("id, token, secret, parse_mode, is_active")
    .eq("slug", slug)
    .maybeSingle();
  if (!bot || !bot.is_active)
    return { ok: false, status: 404, error: "bot not found" as const };
  if (!secret || secret !== bot.secret)
    return { ok: false, status: 401, error: "bad secret" as const };
  return { ok: true as const, bot };
}

export async function POST(req: Request, ctx: any) {
  const { params } = (ctx ?? {}) as any;

  const supa = createServerClient();
  const r = await resolveBot(supa, params.slug, req);
  if (!r.ok)
    return NextResponse.json(
      { ok: false, error: r.error },
      { status: r.status },
    );
  // безопасно достаём бота
const bot = r?.bot;
if (!bot?.token) {
  return NextResponse.json(
    { ok: false, error: 'bot not found' },
    { status: 404 }
  );
}

const tg = makeTg(bot.token);


  // ----- дальше вставь твою текущую логику обработки апдейтов -----
  const update = await req.json();
  // пример авто-ответа:
  if (update?.message?.chat?.id && update?.message?.text === "/start") {
    await tg.sendMessage(
      update.message.chat.id,
      "Вітаю! Лояльність підключена ✅",
    );
  }

  return NextResponse.json({ ok: true });
}
