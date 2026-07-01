/**
 * Admin auth — shared utility untuk API routes yang butuh auth.
 *
 * SECURITY: ADMIN_SECRET WAJIB di-set via environment variable.
 * Tidak ada fallback default — app akan crash jika env var tidak ada,
 * daripada jalan dengan secret yang bisa ditebak.
 *
 * Session tokens menggunakan HMAC-SHA256 via Web Crypto API —
 * compatible dengan Edge Runtime (Vercel) dan Node.js.
 * Cookie berisi signed token, BUKAN raw secret.
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

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
 * HMAC-SHA256 sign menggunakan Web Crypto API.
 * Compatible dengan Edge Runtime dan Node.js.
 */
async function hmacSign(data: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(data)
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Timing-safe string comparison untuk mencegah timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Tetap proses full comparison agar timing konsisten
    let _ = 0;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      _ |= (a.charCodeAt(i % a.length) || 0) ^ (b.charCodeAt(i % b.length) || 0);
    }
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Buat session token yang di-sign dengan HMAC.
 * Token format: "{randomHex}.{hmacSignature}"
 * Signature dibuat dari randomHex + ADMIN_SECRET, jadi:
 * - Token bisa diverifikasi tanpa simpan state
 * - Kalau cookie ke-leak, attacker tidak bisa derive ADMIN_SECRET
 * - Token tidak bisa di-forge tanpa ADMIN_SECRET
 */
export async function createSessionToken(): Promise<string> {
  const randomPart = randomBytes(32).toString("hex");
  const secret = getAdminSecret();
  const signature = await hmacSign(randomPart, secret);
  return `${randomPart}.${signature}`;
}

/**
 * Verify session token yang di-sign dengan HMAC.
 */
export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const [randomPart, signature] = token.split(".");
    if (!randomPart || !signature) return false;

    const secret = getAdminSecret();
    const expectedSignature = await hmacSign(randomPart, secret);

    return timingSafeEqual(signature, expectedSignature);
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
 * Pakai: const authErr = await checkAuth(req); if (authErr) return authErr;
 */
export async function checkAuth(req: NextRequest): Promise<NextResponse | null> {
  const secret = getAdminSecret();

  // Method 1: Bearer token di Authorization header
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) {
    return null;
  }

  // Method 2: Cookie-based session (HMAC-signed token)
  const cookieSession = req.cookies.get("jb-admin-session")?.value;
  if (cookieSession && (await verifySessionToken(cookieSession))) {
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
