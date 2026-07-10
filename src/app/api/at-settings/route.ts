import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/admin-auth";
import { setSetting, getAtCredentials } from "@/lib/settings";

export const dynamic = "force-dynamic";

// GET: return AT credentials (masked, untuk admin UI)
export async function GET(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  const creds = await getAtCredentials();
  return NextResponse.json({
    USER_UID: creds.USER_UID ? `${creds.USER_UID.slice(0, 3)}***${creds.USER_UID.slice(-3)} (length: ${creds.USER_UID.length})` : "(not set)",
    SECRET_KEY: creds.SECRET_KEY ? `${creds.SECRET_KEY.slice(0, 3)}***${creds.SECRET_KEY.slice(-3)} (length: ${creds.SECRET_KEY.length})` : "(not set)",
    API_BASE: creds.API_BASE,
    COUNTRY_CODE: creds.COUNTRY_CODE,
    SITE_ID: creds.SITE_ID,
  });
}

// POST: set AT credentials (save to DB)
export async function POST(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { USER_UID, SECRET_KEY, API_BASE, COUNTRY_CODE, SITE_ID } = body;

    const updates: Array<[string, string]> = [];
    if (typeof USER_UID === "string" && USER_UID.trim()) updates.push(["ACCESSTRADE_USER_UID", USER_UID.trim()]);
    if (typeof SECRET_KEY === "string" && SECRET_KEY.trim()) updates.push(["ACCESSTRADE_SECRET_KEY", SECRET_KEY.trim()]);
    if (typeof API_BASE === "string" && API_BASE.trim()) updates.push(["ACCESSTRADE_API_BASE", API_BASE.trim()]);
    if (typeof COUNTRY_CODE === "string" && COUNTRY_CODE.trim()) updates.push(["ACCESSTRADE_COUNTRY_CODE", COUNTRY_CODE.trim()]);
    if (typeof SITE_ID === "string" && SITE_ID.trim()) updates.push(["ACCESSTRADE_SITE_ID", SITE_ID.trim()]);

    for (const [key, value] of updates) {
      await setSetting(key, value);
    }

    return NextResponse.json({ success: true, updated: updates.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
