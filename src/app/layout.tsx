import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactQueryProvider } from "@/components/react-query-provider";
import { Analytics } from "@vercel/analytics/react";

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
            {children}
            <Analytics />
            <Toaster />
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
