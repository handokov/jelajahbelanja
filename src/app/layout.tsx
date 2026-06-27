import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactQueryProvider } from "@/components/react-query-provider";

const interSans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BelanjaViral — Dashboard Produk Viral & Trending",
  description:
    "Temukan produk viral dan best seller dari Amazon, AliExpress, dan marketplace lain. Filter berdasarkan viralitas, terbaru, atau top mingguan.",
  keywords: [
    "BelanjaViral",
    "produk viral",
    "best seller",
    "trending produk",
    "Amazon best sellers",
    "AliExpress hot products",
  ],
  authors: [{ name: "BelanjaViral" }],
  openGraph: {
    title: "BelanjaViral",
    description: "Dashboard produk viral & trending dari berbagai marketplace.",
    siteName: "BelanjaViral",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
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
            <Toaster />
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
