import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSecret, createSessionToken, verifySessionToken } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin-login
 *
 * Login admin dengan secret → set httpOnly cookie dengan session token.
 * Cookie berisi HMAC-signed token, BUKAN raw secret.
 * Ini aman kalau cookie ke-leak — attacker gak bisa derive admin secret dari token.
 *
 * Body: { secret: string }
 * Response: { success: true } + cookie "jb-admin-session"
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { secret } = body;

    if (!secret || typeof secret !== "string") {
      return NextResponse.json(
        { error: "Secret diperlukan" },
        { status: 400 }
      );
    }

    if (!verifyAdminSecret(secret)) {
      // Delay kecil untuk mitigasi brute force
      await new Promise((r) => setTimeout(r, 500));
      return NextResponse.json(
        { error: "Secret salah" },
        { status: 401 }
      );
    }

    // Buat session token (HMAC-signed, bukan raw secret)
    const sessionToken = createSessionToken();

    const response = NextResponse.json({ success: true });

    response.cookies.set("jb-admin-session", sessionToken, {
      httpOnly: true,      // Tidak bisa diakses JS → aman dari XSS
      secure: process.env.NODE_ENV === "production", // HTTPS only di production
      sameSite: "strict",  // Proteksi CSRF
      path: "/",
      maxAge: 60 * 60 * 24, // 24 jam
    });

    return response;
  } catch (err) {
    console.error("[api/admin-login] Error:", err);
    return NextResponse.json(
      { error: "Gagal login" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin-login
 *
 * Logout admin — hapus cookie session.
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("jb-admin-session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0, // Hapus cookie
  });
  return response;
}
