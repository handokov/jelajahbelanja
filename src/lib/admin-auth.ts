/**
 * Admin auth — shared utility untuk API routes yang butuh auth.
 *
 * SECURITY: ADMIN_SECRET WAJIB di-set via environment variable.
 * Tidak ada fallback default — app akan crash jika env var tidak ada,
 * daripada jalan dengan secret yang bisa ditebak.
 *
 * Session tokens menggunakan HMAC-SHA256 — cookie berisi signed token,
 * BUKAN raw secret. Jadi kalau cookie ke-leak, attacker tidak bisa
 * derive admin secret dari token.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual, randomBytes } from "crypto";

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
 * Buat session token yang di-sign dengan HMAC.
 * Token format: "{randomHex}.{hmacSignature}"
 * Signature dibuat dari randomHex + ADMIN_SECRET, jadi:
 * - Token bisa diverifikasi tanpa simpan state
 * - Kalau cookie ke-leak, attacker tidak bisa derive ADMIN_SECRET
 * - Token tidak bisa di-forge tanpa ADMIN_SECRET
 */
export function createSessionToken(): string {
  const randomPart = randomBytes(32).toString("hex");
  const secret = getAdminSecret();
  const signature = createHmac("sha256", secret)
    .update(randomPart)
    .digest("hex");
  return `${randomPart}.${signature}`;
}

/**
 * Verify session token yang di-sign dengan HMAC.
 */
export function verifySessionToken(token: string): boolean {
  try {
    const [randomPart, signature] = token.split(".");
    if (!randomPart || !signature) return false;

    const secret = getAdminSecret();
    const expectedSignature = createHmac("sha256", secret)
      .update(randomPart)
      .digest("hex");

    // Timing-safe comparison untuk mencegah timing attacks
    return timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Cek authorization header ATAU cookie. Return error response kalau gagal, null kalau OK.
 * Mendukung dua metode auth:
 * 1. Bearer token di Authorization header (dari API calls)
 * 2. httpOnly cookie "jb-admin-session" (dari login flow — HMAC-signed token)
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

  // Method 2: Cookie-based session (HMAC-signed token)
  const cookieSession = req.cookies.get("jb-admin-session")?.value;
  if (cookieSession && verifySessionToken(cookieSession)) {
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Verify admin secret dari login form.
 * Dipakai oleh login route saja.
 */
export function verifyAdminSecret(providedSecret: string): boolean {
  const secret = getAdminSecret();
  return providedSecret === secret;
}
