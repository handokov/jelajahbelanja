import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/admin-auth";

/**
 * Middleware — route-level protection untuk JelajahBelanja.
 *
 * Fungsi:
 * 1. Protect admin page (/jb-mgr-admin) — redirect ke login kalau belum auth
 * 2. Protect admin API routes (write operations + sensitive reads) — cek cookie session
 * 3. Add security headers ke semua response
 */

// API routes yang butuh auth (write operations + sensitive reads)
const PROTECTED_API_PATTERNS = [
  { path: "/api/scrape-shopee", methods: ["POST"] },
  { path: "/api/admin-login", methods: [] }, // Login route itself — NOT protected
  { path: "/api/affiliate", methods: ["GET", "PATCH", "POST"] },
  { path: "/api/banners", methods: ["POST", "PATCH", "DELETE"] },
  { path: "/api/categories", methods: ["POST", "PATCH", "DELETE", "PUT"] },
  { path: "/api/shopee-products", methods: ["POST", "PATCH", "DELETE"] },
  { path: "/api/ai-explain", methods: ["POST"] },
];

function isAdminApiPath(pathname: string, method: string): boolean {
  for (const pattern of PROTECTED_API_PATTERNS) {
    if (pathname.startsWith(pattern.path)) {
      if (pattern.methods.includes(method)) {
        return true;
      }
    }
  }
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // === 1. Protect admin page ===
  if (pathname.startsWith("/jb-mgr-admin")) {
    const sessionCookie = req.cookies.get("jb-admin-session")?.value;

    if (!sessionCookie || !verifySessionToken(sessionCookie)) {
      // Redirect ke login page
      const loginUrl = new URL("/jb-mgr-login", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // === 2. Protect admin API routes ===
  if (pathname.startsWith("/api/") && isAdminApiPath(pathname, method)) {
    const sessionCookie = req.cookies.get("jb-admin-session")?.value;
    const authHeader = req.headers.get("authorization");
    const adminSecret = process.env.ADMIN_SECRET;

    // Cek cookie (HMAC-signed token) ATAU bearer token
    const cookieValid = sessionCookie && verifySessionToken(sessionCookie);
    const bearerValid = authHeader && adminSecret && authHeader === `Bearer ${adminSecret}`;

    if (!cookieValid && !bearerValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // === 3. Security headers ===
  const response = NextResponse.next();

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  // HSTS — hanya di production
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  return response;
}

export const config = {
  matcher: [
    // Admin page
    "/jb-mgr-admin/:path*",
    // API routes
    "/api/:path*",
  ],
};
