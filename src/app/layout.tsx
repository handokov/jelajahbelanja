import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactQueryProvider } from "@/components/react-query-provider";
import { Analytics } from "@vercel/analytics/react";
import SWCleanup from "@/components/sw-register";

const interSans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://www.jelajahbelanja.com";
const SITE_NAME = "JelajahBelanja";
const SITE_DESCRIPTION =
  "JelajahBelanja — kurasi produk anak terlengkap dari Shopee & Tokopedia. Temukan jepit rambut anak, kaos kaki sekolah, tas ransel, tumbler, dress anak, mainan edukatif, dan perlengkapan sekolah dengan rating tertinggi dan harga termurah.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "JelajahBelanja — Produk Anak Terkurasi: Fashion, Sekolah & Perlengkapan Bayi",
    template: "%s | JelajahBelanja",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "produk anak",
    "jepit rambut anak",
    "kaos kaki sekolah anak",
    "tas ransel anak",
    "tumbler anak",
    "dress anak perempuan",
    "mukena anak",
    "mainan edukatif anak",
    "perlengkapan sekolah anak",
    "sepatu anak",
    "kacamata anak",
    "hijab anak",
    "buku tulis anak",
    "crayon anak",
    "aksesoris rambut anak",
    "fashion anak",
    "bayi dan balita",
    "produk viral anak tiktok",
    "best seller produk anak",
    "kurasi produk anak",
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
    title: "JelajahBelanja — Produk Anak Terkurasi: Fashion, Sekolah & Perlengkapan Bayi",
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "JelajahBelanja — Produk Anak Terkurasi",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JelajahBelanja — Produk Anak Terkurasi Indonesia",
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
        {/* Pinterest website verification */}
        <meta name="p:domain_verify" content="9630ed65f8d1c0b58a7ff760f26656b8" />
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
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ReactQueryProvider>
            <SWCleanup />
            {children}
            <Analytics />
            <Toaster />
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
