import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/admin-auth";

/**
 * Middleware — protect admin page dan admin API routes.
 *
 * 1. /jb-mgr-admin — redirect ke login kalau belum auth
 * 2. Admin API routes (write operations) — return 401 kalau belum auth
 * 3. Security headers ke semua response
 *
 * PUBLIC routes yang TIDAK di-protect:
 * - /api/products, /api/categories (GET), /api/ai-explain, /api/recommendations
 * - Halaman produk, homepage, dll
 */

// API routes yang butuh auth (write operations + sensitive data)
const PROTECTED_API_PATTERNS = [
  { path: "/api/admin-login", methods: [] }, // Login route itself — NOT protected
  { path: "/api/shopee-products", methods: ["POST", "PATCH", "DELETE"] },
  { path: "/api/categories", methods: ["POST", "PATCH", "DELETE", "PUT"] },
  { path: "/api/affiliate", methods: ["GET", "PATCH", "POST"] },
  { path: "/api/banners", methods: ["POST", "PATCH", "DELETE"] },
  { path: "/api/product-badges", methods: ["POST", "PATCH", "DELETE"] },
  { path: "/api/at-sync", methods: ["GET", "POST"] },
  { path: "/api/bulk-upload", methods: ["POST"] },
  { path: "/api/scrape-shopee", methods: ["POST"] },
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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // === 1. Protect admin page ===
  if (pathname.startsWith("/jb-mgr-admin")) {
    const sessionCookie = req.cookies.get("jb-admin-session")?.value;

    let isAuthed = false;
    if (sessionCookie) {
      try {
        isAuthed = await verifySessionToken(sessionCookie);
      } catch {
        isAuthed = false;
      }
    }

    if (!isAuthed) {
      const loginUrl = new URL("/jb-mgr-login", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // === 2. Protect admin API routes ===
  if (pathname.startsWith("/api/") && isAdminApiPath(pathname, method)) {
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret) {
      // ADMIN_SECRET belum di-set → tolak akses admin API
      return NextResponse.json({ error: "Unauthorized — ADMIN_SECRET not configured" }, { status: 401 });
    }

    const sessionCookie = req.cookies.get("jb-admin-session")?.value;
    const authHeader = req.headers.get("authorization");

    // Cek cookie (HMAC-signed token) ATAU bearer token
    let cookieValid = false;
    try {
      cookieValid = !!(sessionCookie && (await verifySessionToken(sessionCookie)));
    } catch {
      cookieValid = false;
    }
    const bearerValid = authHeader && authHeader === `Bearer ${adminSecret}`;

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
    "/jb-mgr-admin/:path*",
    "/api/:path*",
  ],
};
