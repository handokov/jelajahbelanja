/**
 * Admin auth — shared utility untuk API routes yang butuh auth.
 *
 * SECURITY: ADMIN_SECRET WAJIB di-set via environment variable.
 * Tidak ada fallback default — app akan crash jika env var tidak ada,
 * daripada jalan dengan secret yang bisa ditebak.
 */

import { NextRequest, NextResponse } from "next/server";

function getAdminSecret(): string {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error(
      "ADMIN_SECRET environment variable is required. " +
      "Set it in your .env file before running the app."
    );
  }
  return secret;
}

/**
 * Cek authorization header ATAU cookie. Return error response kalau gagal, null kalau OK.
 * Mendukung dua metode auth:
 * 1. Bearer token di Authorization header (dari admin page)
 * 2. httpOnly cookie "jb-admin-session" (dari login flow)
 *
 * Pakai: const authErr = checkAuth(req); if (authErr) return authErr;
 */
export function checkAuth(req: NextRequest): NextResponse | null {
  const secret = getAdminSecret();

  // Method 1: Bearer token di Authorization header
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) {
    return null;
  }

  // Method 2: Cookie-based session
  const cookieSession = req.cookies.get("jb-admin-session")?.value;
  if (cookieSession && cookieSession === secret) {
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Verify admin secret dari cookie-based session.
 * Dipakai oleh middleware dan login route.
 */
export function verifyAdminSecret(providedSecret: string): boolean {
  const secret = getAdminSecret();
  return providedSecret === secret;
}
