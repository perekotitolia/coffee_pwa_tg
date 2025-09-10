"use client";
import { useParams } from "next/navigation";

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { assertBotAdmin } from "@/app/api/_adminAuth";
