import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactQueryProvider } from "@/components/react-query-provider";
import { Analytics } from "@vercel/analytics/react";
import { PwaLoaderRemover } from "@/components/pwa-loader-remover";

const interSans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/config";

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
    "produk viral 2025",
    "produk viral 2026",
    "trending produk indonesia",
    "diskon shopee",
    "diskon tokopedia",
    "diskon lazada",
    "produk viral 24 jam",
    "best seller mingguan",
    "belanja online",
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
      </head>
      <body
        className={`${interSans.variable} font-sans antialiased bg-background text-foreground`}
      >
        {/* PWA Loading Screen — inline HTML/CSS, tampil sebelum React hydrate.
            Penting untuk low-end Android biar WebView gak blank/crash.
            Akan dihilangkan oleh React setelah hydrate. */}
        <div id="pwa-loader" className="pwa-loader">
          <div className="pwa-loader-inner">
            <div className="pwa-loader-title">JelajahBelanja</div>
            <div className="pwa-loader-sub">Produk Viral &amp; Best Seller Indonesia</div>
            <div className="pwa-loader-spinner" />
          </div>
        </div>
        <noscript>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#7c3aed', color:'#fff', fontFamily:'system-ui', textAlign:'center', padding:'2rem' }}>
            <div>
              <div style={{ fontSize:'2rem', fontWeight:800, marginBottom:'0.5rem' }}>JelajahBelanja</div>
              <div>Produk Viral &amp; Best Seller Indonesia</div>
              <div style={{ marginTop:'1rem', fontSize:'0.875rem', opacity:0.7 }}>Aktifkan JavaScript untuk melanjutkan</div>
            </div>
          </div>
        </noscript>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ReactQueryProvider>
            {children}
            <PwaLoaderRemover />
            <Analytics />
            <Toaster />
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
