"use client";

import * as React from "react";

/**
 * Konfigurasi banner affiliate.
 * Tambahkan banner baru di sini.
 */
export interface BannerConfig {
  id: string;
  name: string;
  href: string;
  imgSrc: string;
  trackingPixel?: string;
  width: number;
  height: number;
  enabled?: boolean;
}

/**
 * Daftar banner affiliate.
 * Sesuaikan dengan banner yang disediakan oleh AccessTrade atau platform lain.
 *
 * CARA MENAMBAHKAN BANNER:
 * 1. Copy format di bawah
 * 2. Ganti YOUR_AFFILIATE_LINK dengan link dari dashboard AccessTrade
 * 3. Ganti tracking pixel URL jika ada
 * 4. enabled: true untuk aktifkan banner
 */
export const AFFILIATE_BANNERS: BannerConfig[] = [
  // ============================================
  // BANNER ACCESSTRADE - GANTI DENGAN DATA ASLI
  // ============================================
  // Banner 300x250 (sidebar)
  {
    id: "accesstrade-300x250",
    name: "AccessTrade 300x250",
    href: "https://accesstrade.co.id/YOUR_AFFILIATE_LINK", // GANTI dengan link affiliate
    imgSrc: "https://accesstrade.co.id/1783307351_300x250.jpg",
    trackingPixel: "https://imp.accesstra.de/img.php?rk=YOUR_TRACKING_ID", // GANTI jika ada
    width: 300,
    height: 250,
    enabled: false, // Set true untuk aktifkan
  },
  // Banner 728x90 (leaderboard - untuk header/footer)
  // {
  //   id: "accesstrade-728x90",
  //   name: "AccessTrade 728x90",
  //   href: "https://accesstrade.co.id/YOUR_AFFILIATE_LINK",
  //   imgSrc: "https://accesstrade.co.id/YOUR_BANNER_ID_728x90.jpg",
  //   trackingPixel: "https://imp.accesstra.de/img.php?rk=YOUR_TRACKING_ID",
  //   width: 728,
  //   height: 90,
  //   enabled: true,
  // },
  // Banner 160x600 (skyscraper - sidebar besar)
  // {
  //   id: "accesstrade-160x600",
  //   name: "AccessTrade 160x600",
  //   href: "https://accesstrade.co.id/YOUR_AFFILIATE_LINK",
  //   imgSrc: "https://accesstrade.co.id/YOUR_BANNER_ID_160x600.jpg",
  //   trackingPixel: "https://imp.accesstra.de/img.php?rk=YOUR_TRACKING_ID",
  //   width: 160,
  //   height: 600,
  //   enabled: true,
  // },
  // ============================================
  // BANNER LAIN - SHOPEE, TIKTOK, DLL
  // ============================================
];

interface AffiliateBannerProps {
  /** Banner spesifik yang ingin ditampilkan. Jika tidak diisi, akan pilih banner aktif secara acak */
  bannerId?: string;
  /** Ukuran maksimal container. Default: 300x250 */
  maxWidth?: number;
  /** Tampilkan label "Iklan" */
  showLabel?: boolean;
  /** Kelas tambahan untuk container */
  className?: string;
}

/**
 * Komponen untuk menampilkan banner affiliate (AccessTrade, Shopee, dll).
 * Mendukung tracking pixel untuk impression tracking.
 */
export function AffiliateBanner({
  bannerId,
  maxWidth = 300,
  showLabel = true,
  className = "",
}: AffiliateBannerProps) {
  // Filter banner yang aktif
  const activeBanners = AFFILIATE_BANNERS.filter((b) => b.enabled !== false);

  // Jika tidak ada banner aktif, tampilkan placeholder
  if (activeBanners.length === 0) {
    return (
      <div
        className={`rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center ${className}`}
        style={{ maxWidth, aspectRatio: "300/250" }}
      >
        <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center px-4">
          Slot Iklan
          <br />
          <span className="text-[10px]">{maxWidth}x250</span>
        </p>
      </div>
    );
  }

  // Pilih banner: spesifik atau acak
  const banner = bannerId
    ? activeBanners.find((b) => b.id === bannerId) || activeBanners[0]
    : activeBanners[Math.floor(Math.random() * activeBanners.length)];

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
        className="block rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
        aria-label={banner.name}
      >
        {/* Tracking pixel untuk impression (1x1 invisible) */}
        {banner.trackingPixel && (
          <img
            src={banner.trackingPixel}
            width={1}
            height={1}
            border={0}
            alt=""
            style={{ display: "none" }}
            aria-hidden="true"
          />
        )}
        {/* Banner image */}
        <img
          src={banner.imgSrc}
          alt={banner.name}
          width={banner.width}
          height={banner.height}
          className="w-full h-auto rounded-lg"
          loading="lazy"
        />
      </a>
    </div>
  );
}

/**
 * Banner kecil untuk in-content placement (300x100 atau 320x100).
 */
export function AffiliateBannerSmall({
  className = "",
}: {
  className?: string;
}) {
  const smallBanners = AFFILIATE_BANNERS.filter(
    (b) => b.enabled !== false && b.height <= 100
  );

  if (smallBanners.length === 0) {
    return (
      <div
        className={`rounded border border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center ${className}`}
        style={{ height: 100 }}
      >
        <p className="text-[10px] text-zinc-400">Iklan 320x100</p>
      </div>
    );
  }

  const banner = smallBanners[Math.floor(Math.random() * smallBanners.length)];

  return (
    <div className={`affiliate-banner-small ${className}`}>
      <a
        href={banner.href}
        target="_blank"
        rel="noopener noreferrer nofollow sponsored"
        className="block hover:opacity-90 transition-opacity"
      >
        {banner.trackingPixel && (
          <img
            src={banner.trackingPixel}
            width={1}
            height={1}
            border={0}
            alt=""
            style={{ display: "none" }}
          />
        )}
        <img
          src={banner.imgSrc}
          alt={banner.name}
          width={banner.width}
          height={banner.height}
          className="w-full h-auto"
          loading="lazy"
        />
      </a>
    </div>
  );
}