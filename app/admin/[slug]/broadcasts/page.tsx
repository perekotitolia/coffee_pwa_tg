export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { assertBotAdmin } from "@/app/api/_adminAuth";
