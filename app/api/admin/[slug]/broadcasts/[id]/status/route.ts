// ==============================================================
// FILE: app/api/admin/broadcasts/[id]/status/route.ts
// ==============================================================
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

function assertAdmin4(req: Request) {
  const key = process.env.ADMIN_API_KEY;
  if (!key || req.headers.get("x-admin-key") !== key) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }
  return null;
}

export async function GET(req: Request, ctx: any) {
  const { params } = (ctx ?? {}) as any;

  const unauth = assertAdmin4(req);
  if (unauth) return unauth;
  const id = Number(params.id);
  const supa = createServerClient();

  const { count: total } = await supa
    .from("campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", id);
  const { data: logs } = await supa
    .from("campaign_logs")
    .select("status")
    .eq("campaign_id", id);

  const sent = logs?.filter((x) => x.status === "SENT").length ?? 0;
  const blocked = logs?.filter((x) => x.status === "BLOCKED").length ?? 0;
  const failed = logs?.filter((x) => x.status === "ERROR").length ?? 0;

  return NextResponse.json({
    ok: true,
    total: total ?? 0,
    sent,
    blocked,
    failed,
  });
}
