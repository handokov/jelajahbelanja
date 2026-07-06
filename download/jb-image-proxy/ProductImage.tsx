/**
 * ProductImage Component
 * 
 * File: components/ProductImage.tsx
 * 
 * Komponen gambar produk yang otomatis pakai image proxy
 * buat menghindari broken images dari Tokopedia/Shopee.
 * 
 * Cara pakai di halaman produk:
 *   <ProductImage 
 *     src="https://cbn.net/xxx" 
 *     alt="Rasya Sandal" 
 *     width={300} 
 *     height={300} 
 *   />
 * 
 * Atau hook helper:
 *   const proxyUrl = useProxiedImage(originalUrl);
 */

"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";

// Convert image URL ke proxy URL
export function getProxiedImageUrl(originalUrl: string): string {
  if (!originalUrl) return "";
  
  // Kalau sudah local / sudah di-proxy, skip
  if (originalUrl.startsWith("/") || originalUrl.includes("/api/image-proxy")) {
    return originalUrl;
  }
  
  // Kalau dari Vercel Blob (sudah di-cache), skip
  if (originalUrl.includes("blob.vercel-storage.com") || originalUrl.includes("public.blob.vercel-storage.com")) {
    return originalUrl;
  }
  
  // Proxy melalui API route
  return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
}

// Hook buat proxy image URL
export function useProxiedImage(originalUrl: string): string {
  return getProxiedImageUrl(originalUrl);
}

// Component ProductImage dengan auto-proxy + fallback
export function ProductImage({
  src,
  alt,
  fallbackSrc = "/placeholder-product.png",
  ...props
}: ImageProps & { fallbackSrc?: string }) {
  const [imgSrc, setImgSrc] = useState<string>(
    typeof src === "string" ? getProxiedImageUrl(src) : src
  );
  const [error, setError] = useState(false);

  return (
    <Image
      {...props}
      src={error ? fallbackSrc : imgSrc}
      alt={alt}
      onError={() => {
        if (!error) {
          setError(true);
        }
      }}
    />
  );
}

// Simple img tag version (tanpa Next.js Image optimization)
export function ProductImg({
  src,
  alt,
  className,
  fallbackSrc = "/placeholder-product.png",
  style,
}: {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  style?: React.CSSProperties;
}) {
  const [imgSrc, setImgSrc] = useState(getProxiedImageUrl(src));
  const [failed, setFailed] = useState(false);

  return (
    <img
      src={failed ? fallbackSrc : imgSrc}
      alt={alt}
      className={className}
      style={style}
      onError={() => {
        if (!failed) setFailed(true);
      }}
      loading="lazy"
    />
  );
}
