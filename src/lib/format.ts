/**
 * Format angka ke Rupiah, mis. 150000 -> "Rp 150.000"
 */
export function formatRupiah(value: number): string {
  if (!Number.isFinite(value)) return "Rp 0";
  return "Rp " + Math.round(value).toLocaleString("id-ID");
}

/**
 * Format compact: 1200 -> "1,2k", 1500000 -> "1,5M"
 */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0";
  if (value >= 1_000_000_000) {
    return (value / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (value >= 1_000_000) {
    return (value / 1_000_000).toFixed(1).replace(/\.0$/, "") + "jt";
  }
  if (value >= 1_000) {
    return (value / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return String(value);
}

/**
 * Format sold count: 1200 -> "1,2k terjual", 500 -> "500+ terjual"
 */
export function formatSoldCount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 terjual";
  if (value < 100) return `${value} terjual`;
  if (value < 1000) return `${value}+ terjual`;
  return `${formatCompact(value)} terjual`;
}

/**
 * Format review count: 1234 -> "1,2k review"
 */
export function formatReviewCount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 review";
  return `${formatCompact(value)} review`;
}

/**
 * Format waktu relatif dalam Bahasa Indonesia.
 * input: ISO date string
 */
export function formatTimeAgo(isoDate: string): string {
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return "baru saja";

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMin < 1) return "baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay < 7) return `${diffDay} hari lalu`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} minggu lalu`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)} bulan lalu`;
  return `${Math.floor(diffDay / 365)} tahun lalu`;
}

/**
 * Render bintang rating sederhana berdasarkan nilai 0-5
 */
export function starString(rating: number): string {
  const r = Math.max(0, Math.min(5, rating));
  const full = Math.floor(r);
  const half = r - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(empty);
}
