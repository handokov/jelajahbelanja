"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

/**
 * Konfigurasi banner affiliate dari database.
 */
export interface AffiliateAdData {
  id: string;
  name: string;
  platform: string;
  href: string;
  imgSrc: string;
  trackingPixel: string | null;
  width: number;
  height: number;
  position: string;
  order: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
}

/**
 * Hook untuk fetch affiliate ads aktif dari database.
 */
export function useActiveAffiliateAds(position?: string) {
  return useQuery({
    queryKey: ["active-affiliate-ads", position],
    queryFn: async () => {
      const url = position
        ? `/api/affiliate-ads?active=true&position=${position}`
        : `/api/affiliate-ads?active=true`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const json = await res.json();
      return json.ads as AffiliateAdData[];
    },
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });
}

interface AffiliateBannerProps {
  /** Filter berdasarkan posisi: sidebar, header, footer, in-content */
  position?: string;
  /** Banner spesifik yang ingin ditampilkan */
  bannerId?: string;
  /** Tampilkan label "Iklan" */
  showLabel?: boolean;
  /** Kelas tambahan untuk container */
  className?: string;
}

/**
 * Komponen untuk menampilkan banner affiliate dari database.
 * Mendukung tracking pixel untuk impression tracking.
 *
 * PENTING: referrerPolicy="no-referrer" digunakan agar gambar
 * dari affiliate network (AccessTrade, dll) bisa dimuat tanpa
 * diblokir oleh referrer check.
 */
export function AffiliateBanner({
  position = "sidebar",
  bannerId,
  showLabel = true,
  className = "",
}: AffiliateBannerProps) {
  const { data: ads, isLoading, isError } = useActiveAffiliateAds(position);

  // Loading state
  if (isLoading) {
    return (
      <div
        className={`rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center animate-pulse ${className}`}
        style={{ minHeight: 120 }}
      >
        <p className="text-xs text-zinc-400">Memuat iklan...</p>
      </div>
    );
  }

  // Error atau tidak ada data
  if (isError || !ads || ads.length === 0) {
    return null; // Jangan tampilkan placeholder - lebih bersih
  }

  // Pilih banner: spesifik atau acak
  const banner = bannerId
    ? ads.find((b) => b.id === bannerId) || ads[0]
    : ads[Math.floor(Math.random() * ads.length)];

  return (
    <div className={`affiliate-banner ${className}`}>
      {showLabel && (
        <div className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1 px-1">
          Iklan
        </div>
      )}
      <a
        href={banner.href}
        target="_blank"
        rel="noopener noreferrer nofollow sponsored"
        className="group block rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 hover:border-fuchsia-400 dark:hover:border-fuchsia-500 hover:shadow-lg hover:shadow-fuchsia-500/10 transition-all duration-200 cursor-pointer"
        aria-label={banner.name}
        title={`Klik untuk ${banner.name}`}
      >
        {/* Tracking pixel untuk impression (1x1 invisible) */}
        {banner.trackingPixel && (
          <img
            src={banner.trackingPixel}
            width={1}
            height={1}
            alt=""
            referrerPolicy="no-referrer"
            style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
            aria-hidden="true"
          />
        )}
        {/* Banner image - referrerPolicy no-referrer WAJIB untuk affiliate */}
        <img
          src={banner.imgSrc}
          alt={banner.name}
          width={banner.width}
          height={banner.height}
          className="w-full h-auto block group-hover:scale-[1.02] transition-transform duration-200"
          loading="lazy"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onError={(e) => {
            // Fallback: coba tanpa crossOrigin jika gagal
            const img = e.target as HTMLImageElement;
            if (img.crossOrigin) {
              img.removeAttribute("crossorigin");
              img.src = banner.imgSrc; // retry
            } else {
              // Jika masih gagal, sembunyikan
              img.style.display = "none";
            }
          }}
        />
      </a>
    </div>
  );
}

/**
 * Banner untuk header/footer (leaderboard 728x90).
 */
export function AffiliateBannerLeaderboard({
  className = "",
}: {
  className?: string;
}) {
  return (
    <AffiliateBanner
      position="header"
      showLabel={false}
      className={className}
    />
  );
}

/**
 * Banner untuk footer.
 */
export function AffiliateBannerFooter({
  className = "",
}: {
  className?: string;
}) {
  return (
    <AffiliateBanner
      position="footer"
      showLabel={false}
      className={className}
    />
  );
}

/**
 * Banner untuk in-content (di antara produk).
 */
export function AffiliateBannerInContent({
  className = "",
}: {
  className?: string;
}) {
  return (
    <AffiliateBanner
      position="in-content"
      showLabel={true}
      className={className}
    />
  );
}