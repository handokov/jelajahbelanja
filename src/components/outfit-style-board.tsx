"use client";

import * as React from "react";
import {
  Sparkles,
  ExternalLink,
  Star,
  ArrowRight,
  Palette,
  Flame,
  Crown,
  Dumbbell,
  Heart,
  Moon,
  Sun,
  Zap,
  Camera,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MARKETPLACE_META } from "@/lib/config";
import { ViralBadge, DiscountBadge } from "@/components/badges";
import type { Product, Marketplace } from "@/lib/types";
import { formatRupiah } from "@/lib/format";
import { OUTFIT_STYLE_IMAGES } from "@/data/outfit-images";

/* ─── Style definitions ─── */
export interface OutfitStyle {
  id: string;
  label: string;
  emoji: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  description: string;
  keywords: string[];
}

export const OUTFIT_STYLES: OutfitStyle[] = [
  {
    id: "casual",
    label: "Casual",
    emoji: "☀️",
    icon: Sun,
    gradient: "from-amber-400 to-orange-400",
    description: "Santai tapi tetap stylish — buat sehari-hari",
    keywords: ["kaos", "celana", "sneaker", "casual", "santai", "basic", "everyday", "oversize", "jogger", "slip"],
  },
  {
    id: "streetwear",
    label: "Streetwear",
    emoji: "🔥",
    icon: Flame,
    gradient: "from-red-500 to-orange-500",
    description: "Gaya jalanan yang bold & statement",
    keywords: ["hoodie", "oversize", "sneaker", "streetwear", "mamba", "drop", "cargo", "cap", "tee", "jordan", "nike", "adidas", "yeezy"],
  },
  {
    id: "korean",
    label: "K-Fashion",
    emoji: "🇰🇷",
    icon: Sparkles,
    gradient: "from-pink-400 to-violet-400",
    description: "Minimalis, layering, soft tone — drama Korea vibes",
    keywords: ["korean", "kpop", "cardigan", "blouse", "pleated", "loafers", "minimalis", "layering", "oversized", "pastel"],
  },
  {
    id: "oldmoney",
    label: "Old Money",
    emoji: "👑",
    icon: Crown,
    gradient: "from-amber-600 to-yellow-600",
    description: "Classic, premium, quiet luxury — vibes kelas atas",
    keywords: ["blazer", "loafers", "polo", "linen", "chino", "watch", "leather", "classic", "premium", "formal", "oxford"],
  },
  {
    id: "sporty",
    label: "Athleisure",
    emoji: "💪",
    icon: Dumbbell,
    gradient: "from-emerald-400 to-cyan-400",
    description: "Gym-to-street — aktif tapi tetap fresh",
    keywords: ["sport", "gym", "running", "training", "legging", "dry", "tech", "short", "sepatu olahraga", "jersey", "nike", "adidas"],
  },
  {
    id: "datenight",
    label: "Date Night",
    emoji: "💕",
    icon: Heart,
    description: "Romantic, clean, impress your date",
    gradient: "from-rose-400 to-pink-500",
    keywords: ["dress", "shirt", "blazer", "heel", "clutch", "parfum", "elegant", "romantic", "satin", "silk"],
  },
  {
    id: "minimalist",
    label: "Minimalis",
    emoji: "🌙",
    icon: Moon,
    gradient: "from-zinc-400 to-zinc-600",
    description: "Less is more — clean lines, neutral colors",
    keywords: ["basic", "minimal", "monochrome", "black", "white", "neutral", "clean", "simple", "uniqlo", "cos"],
  },
];

/* ─── Filter products by style keywords ─── */
function filterByStyle(products: Product[], style: OutfitStyle): Product[] {
  if (style.id === "casual") return products; // Default: show all

  const scored = products
    .map((p) => {
      const text = `${p.title} ${p.category}`.toLowerCase();
      let score = 0;
      for (const kw of style.keywords) {
        if (text.includes(kw)) score += 10;
      }
      if (p.isViral) score += 5;
      if ((p.discountPercent || 0) > 30) score += 3;
      return { product: p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.product);

  return scored.length >= 2 ? scored : products;
}

/* ─── Inspiration Photo Gallery ─── */
function InspirationGallery({ style }: { style: OutfitStyle }) {
  const images = OUTFIT_STYLE_IMAGES[style.id];
  if (!images || images.length === 0) return null;

  const [activeIdx, setActiveIdx] = React.useState(0);

  return (
    <div className="mb-2">
      {/* Main inspiration photo */}
      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 mb-1.5">
        <img
          src={images[activeIdx].url}
          alt={`${style.label} outfit inspiration`}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        {/* Style badge overlay */}
        <div className="absolute top-2 left-2">
          <div className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-white bg-gradient-to-r shadow-md",
            style.gradient
          )}>
            <Camera className="w-2.5 h-2.5" />
            {style.emoji} {style.label} Inspiration
          </div>
        </div>
        {/* Photo source */}
        <div className="absolute bottom-2 right-2">
          <span className="text-[8px] text-white/60 bg-black/30 px-1.5 py-0.5 rounded">
            {images[activeIdx].source}
          </span>
        </div>
      </div>

      {/* Thumbnail row */}
      {images.length > 1 && (
        <div className="flex gap-1.5">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={cn(
                "relative flex-1 aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all duration-200",
                i === activeIdx
                  ? "border-fuchsia-500 shadow-md scale-[1.02]"
                  : "border-transparent opacity-60 hover:opacity-90 hover:border-zinc-300 dark:hover:border-zinc-600"
              )}
            >
              <img
                src={img.url}
                alt={`${style.label} outfit ${i + 1}`}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Outfit Board Item ─── */
function OutfitBoardItem({
  product,
  onOpen,
  size = "normal",
}: {
  product: Product;
  onOpen: (p: Product) => void;
  size?: "normal" | "large" | "wide";
}) {
  const mpMeta = MARKETPLACE_META[product.marketplace] ?? MARKETPLACE_META.mock;
  const targetUrl = product.affiliateUrl || product.url;

  return (
    <div
      onClick={() => onOpen(product)}
      className={cn(
        "relative group cursor-pointer overflow-hidden rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5",
        size === "large" && "row-span-2",
        size === "wide" && "col-span-2"
      )}
    >
      <div className={cn(
        "relative overflow-hidden",
        size === "large" ? "h-full" : "aspect-square",
        size === "wide" && "aspect-[2/1]"
      )}>
        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
          <Badge className={cn(mpMeta.className, "text-[7px] font-semibold px-1 py-0 h-4")}>
            {mpMeta.label}
          </Badge>
        </div>
        {product.discountPercent && product.discountPercent > 0 && (
          <div className="absolute top-1.5 right-1.5">
            <DiscountBadge percent={product.discountPercent} size="xs" />
          </div>
        )}
        {product.isViral && (
          <div className="absolute bottom-1.5 left-1.5">
            <ViralBadge size="xs" />
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-2.5 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <p className="text-[10px] text-white font-medium line-clamp-2 leading-tight mb-1">
            {product.title}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">
              {formatRupiah(product.price)}
            </span>
            <div className="flex items-center gap-0.5 text-[8px] text-white/80">
              <Star className="w-2 h-2 fill-yellow-400 text-yellow-400" />
              {product.rating.toFixed(1)}
            </div>
          </div>
          <a
            href={targetUrl}
            target="_blank"
            rel="nofollow sponsored noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-1 inline-flex items-center gap-0.5 text-[8px] font-bold text-fuchsia-300 hover:text-white"
          >
            Beli <ExternalLink className="w-2 h-2" />
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
interface OutfitStyleBoardProps {
  product: Product;
  recommendations: Product[];
  onOpenProduct: (p: Product) => void;
}

export function OutfitStyleBoard({
  product,
  recommendations,
  onOpenProduct,
}: OutfitStyleBoardProps) {
  const [activeStyle, setActiveStyle] = React.useState<OutfitStyle>(OUTFIT_STYLES[0]);

  // Combine main product + recommendations, then filter by style
  const allProducts = React.useMemo(() => {
    const combined = [product, ...recommendations];
    return filterByStyle(combined, activeStyle);
  }, [product, recommendations, activeStyle]);

  // Determine layout sizes for visual variety
  const layoutSizes = React.useMemo(() => {
    const count = allProducts.length;
    if (count <= 2) return allProducts.map(() => "wide" as const);
    if (count === 3) return ["large" as const, "normal" as const, "normal" as const];
    if (count === 4) return ["large" as const, "normal" as const, "normal" as const, "normal" as const];
    return allProducts.map((_, i) => (i % 3 === 0 ? "large" as const : "normal" as const));
  }, [allProducts.length]);

  // Total outfit price
  const outfitTotal = allProducts.reduce((sum, p) => sum + p.price, 0);

  const StyleIcon = activeStyle.icon;

  return (
    <div className="rounded-xl overflow-hidden border border-fuchsia-200/60 dark:border-fuchsia-800/30 bg-gradient-to-br from-fuchsia-50/50 to-violet-50/50 dark:from-fuchsia-950/20 dark:to-violet-950/20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-fuchsia-100/60 dark:bg-fuchsia-900/20 border-b border-fuchsia-200/60 dark:border-fuchsia-800/30">
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r text-white flex-shrink-0",
            activeStyle.gradient
          )}>
            <StyleIcon className="w-3 h-3" />
          </div>
          <span className="text-xs font-semibold text-fuchsia-700 dark:text-fuchsia-300">
            Outfit Lookbook
          </span>
        </div>
        <span className="text-[10px] font-medium text-fuchsia-600 dark:text-fuchsia-400">
          Total ~{formatRupiah(outfitTotal)}
        </span>
      </div>

      {/* Style selector chips */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {OUTFIT_STYLES.map((style) => {
            const isActive = activeStyle.id === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => setActiveStyle(style)}
                className={cn(
                  "flex-shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-semibold border transition-all duration-200",
                  isActive
                    ? cn("bg-gradient-to-r text-white border-transparent shadow-md", style.gradient)
                    : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-fuchsia-300 dark:hover:border-fuchsia-600"
                )}
              >
                <span className="text-xs">{style.emoji}</span>
                <span className="hidden sm:inline">{style.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
          {activeStyle.emoji} {activeStyle.description}
        </p>
      </div>

      {/* Real outfit inspiration photos */}
      <div className="px-3 pb-2">
        <InspirationGallery style={activeStyle} />
      </div>

      {/* Divider */}
      <div className="mx-3 flex items-center gap-2 mb-2">
        <div className="flex-1 h-px bg-fuchsia-200/60 dark:bg-fuchsia-800/30" />
        <span className="text-[9px] font-semibold text-fuchsia-500 dark:text-fuchsia-400 uppercase tracking-wider">
          Beli Item Ini
        </span>
        <div className="flex-1 h-px bg-fuchsia-200/60 dark:bg-fuchsia-800/30" />
      </div>

      {/* Visual outfit board — masonry-style grid */}
      <div className="px-3 pb-3">
        {allProducts.length >= 2 ? (
          <div className="grid grid-cols-2 auto-rows-[100px] gap-1.5">
            {allProducts.map((p, i) => (
              <OutfitBoardItem
                key={p.id}
                product={p}
                onOpen={onOpenProduct}
                size={layoutSizes[i]}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-6 text-[11px] text-zinc-400">
            <Palette className="w-4 h-4 mr-1.5" />
            Pilih style lain buat lihat outfit combo
          </div>
        )}

        {/* CTA: Buy full outfit */}
        {allProducts.length >= 2 && (
          <div className="mt-2.5 flex items-center justify-center">
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-bold text-white shadow-lg",
                "bg-gradient-to-r",
                activeStyle.gradient,
                "hover:scale-105 active:scale-95 transition-transform"
              )}
            >
              <Zap className="w-3 h-3" />
              Beli Full Outfit ~{formatRupiah(outfitTotal)}
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
