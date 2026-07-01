/**
 * Shared badge components — dipakai di product-card, product-detail-dialog,
 * outfit-style-board, dan ProductDetailClient.
 *
 * Sebelumnya: inline badge code duplikat di 6+ lokasi.
 * Sekarang: satu definisi, import di mana pun.
 */

import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ViralBadgeProps {
  /** Ukuran: "xs" = compact/sidebar, "sm" = default card, "md" = detail/dialog */
  size?: "xs" | "sm" | "md";
}

const VIRAL_BADGE_STYLES: Record<string, string> = {
  xs: "bg-yellow-400 text-yellow-950 hover:bg-yellow-400 text-[7px] font-bold px-1 py-0 h-3.5 animate-pulse",
  sm: "bg-yellow-400 text-yellow-950 hover:bg-yellow-400 text-[10px] font-bold px-1.5 py-0 h-5 animate-pulse",
  md: "bg-yellow-400 text-yellow-950 hover:bg-yellow-400 text-[10px] font-bold px-2 py-0.5 h-6 animate-pulse shadow-lg",
};

const VIRAL_ICON_SIZES: Record<string, string> = {
  xs: "w-2 h-2 mr-0.5",
  sm: "w-2.5 h-2.5 mr-0.5",
  md: "w-3 h-3 mr-0.5",
};

export function ViralBadge({ size = "sm" }: ViralBadgeProps) {
  return (
    <Badge className={VIRAL_BADGE_STYLES[size]}>
      <Sparkles className={VIRAL_ICON_SIZES[size]} />
      VIRAL
    </Badge>
  );
}

interface DiscountBadgeProps {
  percent: number;
  /** Ukuran: "xs" = compact/sidebar, "sm" = default card, "md" = detail/dialog */
  size?: "xs" | "sm" | "md";
}

const DISCOUNT_BADGE_STYLES: Record<string, string> = {
  xs: "bg-red-500 text-white hover:bg-red-500 text-[7px] font-bold px-1 py-0 h-4",
  sm: "bg-red-500 text-white hover:bg-red-500 text-[10px] font-bold px-1.5 py-0 h-5",
  md: "bg-red-500 text-white hover:bg-red-500 text-xs font-bold px-2 py-0.5 h-6 shadow-lg",
};

export function DiscountBadge({ percent, size = "sm" }: DiscountBadgeProps) {
  if (percent <= 0) return null;
  return (
    <Badge className={DISCOUNT_BADGE_STYLES[size]}>
      −{percent}%
    </Badge>
  );
}

/**
 * Viral urgency message — "Produk viral — stok terbatas, buruan!"
 * Sebelumnya: duplikat di ProductDetailClient.tsx dan product-detail-dialog.tsx.
 * Sekarang: satu komponen, import di mana pun.
 */
interface ViralUrgencyMessageProps {
  size?: "sm" | "md";
}

import { TrendingUp } from "lucide-react";

export function ViralUrgencyMessage({ size = "sm" }: ViralUrgencyMessageProps) {
  return (
    <div className={`flex items-center justify-center gap-1.5 text-fuchsia-600 dark:text-fuchsia-400 ${size === "sm" ? "text-[10px] mt-2" : "text-xs mt-1.5"}`}>
      <TrendingUp className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      <span className="font-medium">Produk viral — stok terbatas, buruan!</span>
    </div>
  );
}
