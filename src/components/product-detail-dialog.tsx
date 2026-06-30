"use client";

import * as React from "react";
import {
  Sparkles,
  Star,
  ExternalLink,
  MapPin,
  X,
  Bot,
  Loader2,
  TrendingUp,
  ShieldCheck,
  Zap,
  ShoppingBag,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Product, Marketplace } from "@/lib/types";
import { MARKETPLACE_META } from "@/lib/config";
import { ViralBadge, DiscountBadge } from "@/components/badges";
import {
  formatRupiah,
  formatSoldCount,
  formatReviewCount,
} from "@/lib/format";

interface ProductDetailDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailDialog({
  product,
  open,
  onOpenChange,
}: ProductDetailDialogProps) {
  const [aiExplanation, setAiExplanation] = React.useState("");
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState(false);
  const [displayedText, setDisplayedText] = React.useState("");
  const [typewriterDone, setTypewriterDone] = React.useState(false);

  // Fetch AI explanation when product changes
  React.useEffect(() => {
    if (!product || !open) {
      setAiExplanation("");
      setDisplayedText("");
      setAiLoading(false);
      setAiError(false);
      setTypewriterDone(false);
      return;
    }

    let cancelled = false;

    async function fetchExplanation() {
      setAiLoading(true);
      setAiError(false);
      setAiExplanation("");
      setDisplayedText("");
      setTypewriterDone(false);

      try {
        const res = await fetch("/api/ai-explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product }),
        });

        if (!res.ok) throw new Error("Failed");

        const data = await res.json();
        if (!cancelled) {
          setAiExplanation(data.explanation);
        }
      } catch {
        if (!cancelled) {
          setAiError(true);
        }
      } finally {
        if (!cancelled) {
          setAiLoading(false);
        }
      }
    }

    fetchExplanation();
    return () => {
      cancelled = true;
    };
  }, [product, open]);

  // Typewriter effect
  React.useEffect(() => {
    if (!aiExplanation) return;

    let i = 0;
    setDisplayedText("");
    setTypewriterDone(false);

    const interval = setInterval(() => {
      i += 2;
      if (i >= aiExplanation.length) {
        setDisplayedText(aiExplanation);
        setTypewriterDone(true);
        clearInterval(interval);
      } else {
        setDisplayedText(aiExplanation.slice(0, i));
      }
    }, 20);

    return () => clearInterval(interval);
  }, [aiExplanation]);

  if (!product) return null;

  const mpMeta = MARKETPLACE_META[product.marketplace] ?? MARKETPLACE_META.mock;
  const targetUrl = product.affiliateUrl || product.url;
  const savings = product.originalPrice
    ? product.originalPrice - product.price
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-lg p-0 gap-0 rounded-2xl border-0 shadow-2xl 
                   flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden"
      >
        <DialogTitle className="sr-only">{product.title}</DialogTitle>

        {/* ===== SCROLLABLE BODY ===== */}
        <div className="flex-1 overflow-y-auto overscroll-contain">

          {/* Close button — INSIDE scroll area, STICKY to top */}
          <div className="sticky top-0 z-20 flex justify-end pointer-events-none">
            <button
              onClick={() => onOpenChange(false)}
              className="pointer-events-auto m-2 rounded-full bg-black/40 backdrop-blur-sm p-2 text-white hover:bg-black/60 active:bg-black/70 transition shadow-lg"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Product image — shorter on mobile */}
          <div className="relative w-full h-48 sm:h-56 md:h-64 -mt-12 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-full object-cover"
            />
            {/* Overlay badges */}
            <div className="absolute bottom-2 left-2 flex gap-1.5">
              {product.isViral && <ViralBadge size="md" />}
              <Badge className={cn(mpMeta.className, "text-[10px] font-semibold px-2 py-0.5 h-6 shadow-lg")}>
                {mpMeta.label}
              </Badge>
            </div>
            {product.discountPercent && product.discountPercent > 0 && (
              <div className="absolute bottom-2 right-2">
                <DiscountBadge percent={product.discountPercent} size="md" />
              </div>
            )}
            {/* Bottom gradient */}
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent" />
          </div>

          {/* Product info */}
          <div className="px-5 pt-4 pb-3">
            {/* Category + location */}
            <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="font-medium text-fuchsia-600 dark:text-fuchsia-400">{product.category}</span>
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

            {/* Title */}
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 leading-snug mb-3">
              {product.title}
            </h2>

            {/* Price row */}
            <div className="flex flex-wrap items-end gap-x-2 gap-y-1 mb-3">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {formatRupiah(product.price)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-sm text-zinc-400 line-through mb-0.5">
                  {formatRupiah(product.originalPrice)}
                </span>
              )}
              {savings > 0 && (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] font-bold px-1.5 py-0 h-5 mb-0.5">
                  Hemat {formatRupiah(savings)}
                </Badge>
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {product.rating.toFixed(1)}
                </span>
              </div>
              <span>{formatReviewCount(product.reviewCount)} review</span>
              <span className="font-semibold text-fuchsia-600 dark:text-fuchsia-400">
                {formatSoldCount(product.soldCount)} terjual
              </span>
            </div>
          </div>

          {/* AI Advisor section */}
          <div className="mx-5 mb-4 rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30 border border-violet-200/60 dark:border-violet-800/30 overflow-hidden">
            {/* AI header */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-violet-100/60 dark:bg-violet-900/20 border-b border-violet-200/60 dark:border-violet-800/30">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-600 text-white flex-shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                JB AI Advisor
              </span>
              {aiLoading && (
                <Loader2 className="w-3 h-3 animate-spin text-violet-500 flex-shrink-0" />
              )}
              {typewriterDone && (
                <ShieldCheck className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              )}
            </div>

            {/* AI content */}
            <div className="px-4 py-3 min-h-[60px]">
              {aiLoading && !aiExplanation ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs text-violet-600 dark:text-violet-400">
                    <Zap className="w-3 h-3 animate-pulse" />
                    <span>JB lagi analisis produk ini...</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-3 bg-violet-200/50 dark:bg-violet-800/30 rounded-full animate-pulse w-full" />
                    <div className="h-3 bg-violet-200/50 dark:bg-violet-800/30 rounded-full animate-pulse w-4/5" />
                    <div className="h-3 bg-violet-200/50 dark:bg-violet-800/30 rounded-full animate-pulse w-3/5" />
                  </div>
                </div>
              ) : aiError ? (
                <div className="text-xs text-violet-600 dark:text-violet-400">
                  <p>Oops, JB lagi istirahat sebentar.</p>
                  <p className="mt-1 text-zinc-500">
                    Tapi produk ini tetap worth it buat dicek langsung di {mpMeta.label}!
                  </p>
                </div>
              ) : (
                <div className="text-[13px] leading-relaxed text-violet-900 dark:text-violet-100 whitespace-pre-wrap">
                  {displayedText}
                  {!typewriterDone && aiExplanation && (
                    <span className="inline-block w-0.5 h-4 bg-violet-500 animate-pulse ml-0.5 align-text-bottom" />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== STICKY BOTTOM — Buy button always visible ===== */}
        <div className="flex-shrink-0 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-4">
          <Button asChild size="lg" className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-semibold shadow-lg shadow-violet-500/25">
            <a
              href={targetUrl}
              target="_blank"
              rel="nofollow sponsored noopener noreferrer"
              aria-label={`Beli ${product.title} di ${mpMeta.label}`}
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Beli di {mpMeta.label}
              <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
            </a>
          </Button>
          {product.isViral && (
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-fuchsia-600 dark:text-fuchsia-400 mt-2">
              <TrendingUp className="w-3 h-3" />
              <span className="font-medium">Produk viral — stok terbatas, buruan!</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
