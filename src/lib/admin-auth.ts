/**
 * Admin auth — shared utility untuk API routes yang butuh auth.
 * Sebelumnya: ADMIN_SECRET + checkAuth() duplikat di scrape-shopee/route.ts.
 * Sekarang: satu definisi, import di mana pun.
 */

import { NextRequest, NextResponse } from "next/server";

export const ADMIN_SECRET = process.env.ADMIN_SECRET || "jelajahbelanja2024";

/**
 * Cek authorization header. Return error response kalau gagal, null kalau OK.
 * Pakai: const authErr = checkAuth(req); if (authErr) return authErr;
 */
export function checkAuth(req: NextRequest): NextResponse | null {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${ADMIN_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
