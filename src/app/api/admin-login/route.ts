import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSecret, createSessionToken } from "@/lib/admin-auth";

/**
 * POST /api/admin-login
 * Body: { secret: string }
 * 
 * Login dengan admin secret → dapat httpOnly cookie (HMAC-signed session token).
 * Cookie name: "jb-admin-session", max age 7 hari.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { secret } = body;

    if (!secret || typeof secret !== "string") {
      return NextResponse.json({ error: "Secret wajib diisi" }, { status: 400 });
    }

    if (!verifyAdminSecret(secret)) {
      return NextResponse.json({ error: "Secret salah" }, { status: 401 });
    }

    // Buat HMAC-signed session token
    const token = await createSessionToken();

    const response = NextResponse.json({ success: true });

    // Set httpOnly cookie — aman dari XSS, tidak bisa di-read JS
    response.cookies.set("jb-admin-session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });

    return response;
  } catch (err) {
    console.error("[api/admin-login] Error:", err);
    return NextResponse.json({ error: "Gagal login" }, { status: 500 });
  }
}
