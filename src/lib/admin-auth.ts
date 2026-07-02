/**
 * Admin auth — shared utility untuk API routes yang butuh auth.
 *
 * Session tokens menggunakan HMAC-SHA256 via Web Crypto API —
 * compatible dengan Edge Runtime (Vercel) dan Node.js.
 * Cookie berisi signed token, BUKAN raw secret.
 *
 * SAFE: Jika ADMIN_SECRET belum di-set, getAdminSecret() return empty string
 * dan semua auth check gagal dengan aman (return "not authenticated"),
 * TIDAK throw/crash seluruh endpoint.
 */

import { NextRequest, NextResponse } from "next/server";

function getAdminSecret(): string {
  // Return empty string jika belum di-set — auth checks gagal aman, bukan crash
  return process.env.ADMIN_SECRET || "";
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
 */
export async function createSessionToken(): Promise<string> {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const randomPart = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const secret = getAdminSecret();
  const signature = await hmacSign(randomPart, secret);
  return `${randomPart}.${signature}`;
}

/**
 * Verify session token yang di-sign dengan HMAC.
 * Return false jika token invalid ATAU ADMIN_SECRET belum di-set.
 */
export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const secret = getAdminSecret();
    if (!secret) return false; // Tidak ada secret → tidak bisa verify

    const [randomPart, signature] = token.split(".");
    if (!randomPart || !signature) return false;

    const expectedSignature = await hmacSign(randomPart, secret);
    return timingSafeEqual(signature, expectedSignature);
  } catch {
    return false;
  }
}

/**
 * Cek authorization header ATAU cookie. Return error response kalau gagal, null kalau OK.
 * SAFE: Tidak throw, hanya return 401 response.
 */
export async function checkAuth(req: NextRequest): Promise<NextResponse | null> {
  const secret = getAdminSecret();
  if (!secret) {
    return NextResponse.json({ error: "Unauthorized — ADMIN_SECRET not configured" }, { status: 401 });
  }

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
 */
export function verifyAdminSecret(providedSecret: string): boolean {
  const secret = getAdminSecret();
  if (!secret) return false;
  return providedSecret === secret;
}
