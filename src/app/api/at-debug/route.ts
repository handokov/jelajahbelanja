import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  // Return LENGTH only (not value) for security
  return NextResponse.json({
    USER_UID_length: (process.env.ACCESSTRADE_USER_UID || "").length,
    USER_UID_first3: (process.env.ACCESSTRADE_USER_UID || "").slice(0, 3),
    USER_UID_last3: (process.env.ACCESSTRADE_USER_UID || "").slice(-3),
    SECRET_KEY_length: (process.env.ACCESSTRADE_SECRET_KEY || "").length,
    SECRET_KEY_first3: (process.env.ACCESSTRADE_SECRET_KEY || "").slice(0, 3),
    SECRET_KEY_last3: (process.env.ACCESSTRADE_SECRET_KEY || "").slice(-3),
    API_BASE: process.env.ACCESSTRADE_API_BASE || "(not set)",
    COUNTRY_CODE: process.env.ACCESSTRADE_COUNTRY_CODE || "(not set)",
    SITE_ID: process.env.ACCESSTRADE_SITE_ID || "(not set)",
    // Expected values for comparison
    expected_USER_UID_length: 32,
    expected_SECRET_KEY_length: 32,
  });
}
