"use client";

import * as React from "react";
import { Star, ExternalLink, MapPin } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MARKETPLACE_META, AFFILIATE_LINK_REL } from "@/lib/config";
import { ViralBadge, DiscountBadge } from "@/components/badges";
import type { Product, Marketplace } from "@/lib/types";
import {
  formatRupiah,
  formatSoldCount,
  formatReviewCount,
  formatTimeAgo,
} from "@/lib/format";

type Variant = "featured" | "default" | "compact";

interface ProductCardProps {
  product: Product;
  variant?: Variant;
  rank?: number;
}

function MarketplaceBadge({ marketplace }: { marketplace: Marketplace }) {
  const meta = MARKETPLACE_META[marketplace] ?? MARKETPLACE_META.mock;
  return (
    <Badge className={cn(meta.className, "text-[10px] font-semibold px-1.5 py-0 h-5")}>
      {meta.label}
    </Badge>
  );
}

function RatingStars({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  // Kalau belum ada review, tampilkan "Belum ada rating"
  if (!reviewCount || reviewCount <= 0) {
    return (
      <div className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
        <Star className="w-3 h-3 text-zinc-300 dark:text-zinc-600" />
        <span>Belum ada rating</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
      <div className="flex items-center gap-0.5">
        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
          {rating.toFixed(1)}
        </span>
      </div>
      <span aria-hidden>·</span>
      <span>{formatReviewCount(reviewCount)}</span>
    </div>
  );
}

function PriceBlock({
  price,
  originalPrice,
  discountPercent,
  size = "default",
}: {
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  size?: "default" | "large";
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span
        className={cn(
          "font-bold text-zinc-900 dark:text-zinc-50",
          size === "large" ? "text-lg" : "text-base"
        )}
      >
        {formatRupiah(price)}
      </span>
      {originalPrice && originalPrice > price && (
        <span className="text-xs text-zinc-400 line-through">
          {formatRupiah(originalPrice)}
        </span>
      )}
      {discountPercent && discountPercent > 0 && (
        <Badge className="bg-red-500 text-white hover:bg-red-500 text-[10px] font-bold px-1.5 py-0 h-5">
          −{discountPercent}%
        </Badge>
      )}
    </div>
  );
}

export function ProductCard({ product, variant = "default", rank }: ProductCardProps) {
  // Link ke halaman detail produk
  const detailUrl = `/produk/${product.marketplace}-${product.id}`;
  // Link beli langsung (shortlink / affiliate)
  const buyUrl = `/beli/${product.marketplace}-${product.id}`;

  if (variant === "featured") {
    return (
<<<<<<< HEAD
      <div className="group relative flex flex-col md:flex-row gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition"
      >
        <Link href={detailUrl} className="relative w-full md:w-2/5 aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800 block">
          <img
            src={product.image}
            alt={`${product.title} - ${product.marketplace} ${product.category} viral best seller`}
            loading="lazy"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.isViral && <ViralBadge />}
            <Badge className="bg-fuchsia-600 text-white hover:bg-fuchsia-600 text-[10px] font-bold px-1.5 py-0 h-5">
              #1 FEATURED
            </Badge>
=======
      <div className="group relative flex flex-col md:flex-row gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
        <Link href={detailUrl} className="contents">
          <div className="relative w-full md:w-2/5 aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800 cursor-pointer">
            <img
              src={product.image}
              alt={`${product.title} - ${product.marketplace} ${product.category} viral best seller`}
              loading="lazy"
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {product.isViral && <ViralBadge />}
              <Badge className="bg-fuchsia-600 text-white hover:bg-fuchsia-600 text-[10px] font-bold px-1.5 py-0 h-5">
                #1 FEATURED
              </Badge>
            </div>
            <div className="absolute top-2 right-2">
              <MarketplaceBadge marketplace={product.marketplace} />
            </div>
>>>>>>> 708b746e9744a8c43d24b54b1818a255a7a7fd9e
          </div>
          <div className="flex-1 flex flex-col gap-3 p-4 md:p-6">
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>{product.category}</span>
              <span aria-hidden>·</span>
              <span>{formatTimeAgo(product.timestamp)}</span>
              {product.location && (
                <>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    {product.location}
                  </span>
                </>
              )}
            </div>
            <h3 className="text-lg md:text-xl font-semibold text-zinc-900 dark:text-zinc-50 line-clamp-2 leading-snug">
              {product.title}
            </h3>
            <PriceBlock
              price={product.price}
              originalPrice={product.originalPrice}
              discountPercent={product.discountPercent}
              size="large"
            />
            <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
            <div className="text-sm text-zinc-700 dark:text-zinc-300">
              <span className="font-semibold text-fuchsia-600 dark:text-fuchsia-400">
                {formatSoldCount(product.soldCount)}
              </span>
              <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                · Viral score: {product.viralScore.toFixed(1)}
              </span>
            </div>
          </div>
        </Link>
<<<<<<< HEAD
        <div className="flex-1 flex flex-col gap-3 p-4 md:p-6">
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>{product.category}</span>
            <span aria-hidden>·</span>
            <span>{formatTimeAgo(product.timestamp)}</span>
            {product.location && (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-0.5">
                  <MapPin className="w-3 h-3" />
                  {product.location}
                </span>
              </>
            )}
          </div>
          <Link href={detailUrl} className="hover:underline">
            <h3 className="text-lg md:text-xl font-semibold text-zinc-900 dark:text-zinc-50 line-clamp-2 leading-snug">
              {product.title}
            </h3>
          </Link>
          <PriceBlock
            price={product.price}
            originalPrice={product.originalPrice}
            discountPercent={product.discountPercent}
            size="large"
          />
          <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
          <div className="text-sm text-zinc-700 dark:text-zinc-300">
            <span className="font-semibold text-fuchsia-600 dark:text-fuchsia-400">
              {formatSoldCount(product.soldCount)}
            </span>
            <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
              · Viral score: {product.viralScore.toFixed(1)}
            </span>
          </div>
          <Button asChild size="sm" className="mt-auto w-fit">
=======
        <div className="px-4 md:px-6 pb-4 md:pb-6 md:self-end">
          <Button asChild size="sm" className="w-fit">
>>>>>>> 708b746e9744a8c43d24b54b1818a255a7a7fd9e
            <a
              href={buyUrl}
              target="_blank"
              rel={AFFILIATE_LINK_REL}
              aria-label={`Beli ${product.title} di ${product.marketplace}`}
            >
              Beli Sekarang
              <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
            </a>
          </Button>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <Link
        href={detailUrl}
        className="group flex gap-3 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition"
      >
        <div className="relative w-16 h-16 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <img
            src={product.image}
            alt={`${product.title} - ${product.marketplace}`}
            loading="lazy"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          {rank !== undefined && (
            <span className="text-[10px] font-bold text-fuchsia-600 dark:text-fuchsia-400">
              #{rank}
            </span>
          )}
          <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 line-clamp-2 leading-tight">
            {product.title}
          </p>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="font-bold text-zinc-900 dark:text-zinc-50">
              {formatRupiah(product.price)}
            </span>
            {product.isViral && (
              <ViralBadge size="xs" />
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
            {product.reviewCount > 0 ? (
              <>
                <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                <span>{product.rating.toFixed(1)}</span>
                <span aria-hidden>·</span>
              </>
            ) : (
              <Star className="w-2.5 h-2.5 text-zinc-300 dark:text-zinc-600" />
            )}
            <span>{formatSoldCount(product.soldCount)}</span>
          </div>
        </div>
      </Link>
    );
  }

  // Default variant — NO nested <a> inside <a>
  return (
    <div className="group relative flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
<<<<<<< HEAD
      <Link href={detailUrl} className="relative w-full aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800 block">
        <img
          src={product.image}
          alt={`${product.title} - ${product.marketplace} ${product.category} viral best seller di Indonesia`}
          loading="lazy"
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.isViral && <ViralBadge />}
          <MarketplaceBadge marketplace={product.marketplace} />
        </div>
        {product.discountPercent && product.discountPercent > 0 && (
          <div className="absolute top-2 right-2">
            <DiscountBadge percent={product.discountPercent} size="sm" />
          </div>
        )}
      </Link>
      <div className="flex-1 flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
          <span>{formatTimeAgo(product.timestamp)}</span>
          {product.location && (
            <span className="inline-flex items-center gap-0.5">
              <MapPin className="w-2.5 h-2.5" />
              {product.location}
            </span>
          )}
        </div>
        <Link href={detailUrl} className="hover:underline">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50 line-clamp-2 leading-snug min-h-[2.5rem]">
            {product.title}
          </h3>
        </Link>
        <PriceBlock price={product.price} originalPrice={product.originalPrice} />
        <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          <span className="font-semibold text-fuchsia-600 dark:text-fuchsia-400">
            {formatSoldCount(product.soldCount)}
          </span>
        </div>
=======
      <Link href={detailUrl} className="contents">
        <div className="relative w-full aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800 cursor-pointer">
          <img
            src={product.image}
            alt={`${product.title} - ${product.marketplace} ${product.category} viral best seller di Indonesia`}
            loading="lazy"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.isViral && <ViralBadge />}
            <MarketplaceBadge marketplace={product.marketplace} />
          </div>
          {product.discountPercent && product.discountPercent > 0 && (
            <Badge className="absolute top-2 right-2 bg-red-500 text-white hover:bg-red-500 text-[10px] font-bold px-1.5 py-0 h-5">
              −{product.discountPercent}%
            </Badge>
          )}
        </div>
      </Link>
      <div className="flex-1 flex flex-col gap-2 p-3">
        <Link href={detailUrl} className="contents">
          <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
            <span>{formatTimeAgo(product.timestamp)}</span>
            {product.location && (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5" />
                {product.location}
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50 line-clamp-2 leading-snug min-h-[2.5rem]">
            {product.title}
          </h3>
          <PriceBlock price={product.price} originalPrice={product.originalPrice} />
          <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            <span className="font-semibold text-fuchsia-600 dark:text-fuchsia-400">
              {formatSoldCount(product.soldCount)}
            </span>
          </div>
        </Link>
>>>>>>> 708b746e9744a8c43d24b54b1818a255a7a7fd9e
        <Button asChild size="sm" variant="outline" className="mt-auto w-full">
          <a
            href={buyUrl}
            target="_blank"
            rel={AFFILIATE_LINK_REL}
            aria-label={`Beli ${product.title} di ${product.marketplace}`}
          >
            Beli Sekarang
            <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}
