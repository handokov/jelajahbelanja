import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactQueryProvider } from "@/components/react-query-provider";
import { Analytics } from "@vercel/analytics/react";
import SplashDismissal from "@/components/splash-dismissal";
import SWRegister from "@/components/sw-register";

const interSans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://jelajahbelanja.com";
const SITE_NAME = "JelajahBelanja";
const SITE_DESCRIPTION =
  "JelajahBelanja adalah platform agregator produk viral Indonesia dari Shopee, Tokopedia, dan Lazada. Temukan produk viral 24 jam, best seller mingguan, dan diskon terbesar hari ini.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "JelajahBelanja — Produk Viral & Best Seller Shopee, Tokopedia, Lazada Hari Ini",
    template: "%s | JelajahBelanja",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "produk viral",
    "produk viral shopee",
    "produk viral tiktok",
    "best seller shopee",
    "best seller tokopedia",
    "produk viral 2024",
    "produk viral 2025",
    "trending produk indonesia",
    "diskon shopee",
    "diskon tokopedia",
    "diskon lazada",
    "produk viral 24 jam",
    "best seller mingguan",
    "belanja online",
    "kerja sampingan",
    "affiliate indonesia",
    "JelajahBelanja",
  ],
  authors: [{ name: "JelajahBelanja", url: SITE_URL }],
  creator: "JelajahBelanja",
  publisher: "JelajahBelanja",
  applicationName: SITE_NAME,
  category: "Shopping",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: SITE_URL,
    title: "JelajahBelanja — Produk Viral & Best Seller Indonesia Hari Ini",
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "JelajahBelanja — Produk Viral Indonesia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JelajahBelanja — Produk Viral Indonesia Hari Ini",
    description: SITE_DESCRIPTION,
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#7c3aed" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

// JSON-LD Organization untuk SEO
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "JelajahBelanja",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  sameAs: [
    "https://www.instagram.com/jelajahbelanja",
    "https://www.tiktok.com/@jelajahbelanja",
    "https://twitter.com/jelajahbelanja",
  ],
};

// JSON-LD WebSite untuk sitelinks search box
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "JelajahBelanja",
  url: SITE_URL,
  inLanguage: "id-ID",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/?search={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        {/* PWA Splash Screen — muncul sebelum React hydrate, dihapus oleh SplashDismissal */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var s = document.getElementById('jb-splash');
                if(s) {
                  s.style.display='flex';
                  // Progress bar animation — simulate loading for HP kentang
                  var bar = document.getElementById('jb-splash-bar');
                  if(bar) {
                    var w = 0;
                    var iv = setInterval(function(){
                      w += Math.random() * 15;
                      if(w > 85) { clearInterval(iv); w = 85; }
                      bar.style.width = w + '%';
                    }, 200);
                    // Complete when React hydrate
                    window.__jbSplashComplete = function(){
                      clearInterval(iv);
                      bar.style.width = '100%';
                      setTimeout(function(){
                        s.style.opacity = '0';
                        setTimeout(function(){ s.remove(); }, 400);
                      }, 200);
                    };
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${interSans.variable} font-sans antialiased bg-background text-foreground`}
      >
        {/* Splash screen overlay — pure HTML/CSS, muncul instan sebelum React */}
        <div
          id="jb-splash"
          style={{
            display: "none",
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "linear-gradient(135deg, #7c3aed 0%, #c026d3 100%)",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            transition: "opacity 0.4s ease-out",
          }}
        >
          {/* Logo */}
          <svg width="72" height="72" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="64" height="64" rx="16" fill="white" fillOpacity="0.2"/>
            <path d="M20 20h8v24h-8zM36 20h8v24h-8z" fill="white"/>
            <path d="M16 28h32v8H16z" fill="white" fillOpacity="0.7"/>
          </svg>
          <div style={{ marginTop: 16, color: "white", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>
            JelajahBelanja
          </div>
          <div style={{ marginTop: 4, color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 400 }}>
            Produk Viral &amp; Best Seller
          </div>

          {/* Progress bar — biar user tahu app loading, bukan hang */}
          <div style={{ marginTop: 32, width: 120, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.2)", overflow: "hidden" }}>
            <div id="jb-splash-bar" style={{ width: "0%", height: "100%", borderRadius: 2, background: "white", transition: "width 0.3s ease-out" }} />
          </div>

          {/* Spinner fallback */}
          <div style={{ marginTop: 16, width: 24, height: 24, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "white", borderRadius: "50%", animation: "jb-spin 0.8s linear infinite" }} />
          <style>{`@keyframes jb-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ReactQueryProvider>
            <SplashDismissal />
            <SWRegister />
            {children}
            <Analytics />
            <Toaster />
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
