"use client";

import * as React from "react";
import {
  Star,
  ExternalLink,
  MapPin,
  X,
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
import { MARKETPLACE_META, BUY_BUTTON_GRADIENT, AFFILIATE_LINK_REL } from "@/lib/config";
import { ViralBadge, DiscountBadge, ViralUrgencyMessage } from "@/components/badges";
import {
  formatRupiah,
  formatSoldCount,
  formatReviewCount,
  cleanMarkdown,
} from "@/lib/format";
import { useTypewriterEffect } from "@/hooks/use-typewriter-effect";
import { AiAdvisorBlock } from "@/components/ai-advisor-block";

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

  // Typewriter effect — shared hook
  const { displayedText } = useTypewriterEffect(aiExplanation);

  // Fetch AI explanation when product changes
  React.useEffect(() => {
    if (!product || !open) {
      setAiExplanation("");
      setAiLoading(false);
      setAiError(false);
      return;
    }

    let cancelled = false;

    async function fetchExplanation() {
      setAiLoading(true);
      setAiError(false);
      setAiExplanation("");

      try {
        const res = await fetch("/api/ai-explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product }),
        });

        if (!res.ok) throw new Error("Failed");

        const data = await res.json();
        if (!cancelled) {
          setAiExplanation(cleanMarkdown(data.explanation));
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
              {product.reviewCount > 0 ? (
                <>
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {product.rating.toFixed(1)}
                    </span>
                  </div>
                  <span>{formatReviewCount(product.reviewCount)} review</span>
                </>
              ) : (
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600" />
                  <span className="text-zinc-400 dark:text-zinc-500">Belum ada rating</span>
                </div>
              )}
              <span className="font-semibold text-fuchsia-600 dark:text-fuchsia-400">
                {formatSoldCount(product.soldCount)} terjual
              </span>
            </div>
          </div>

          {/* AI Advisor section */}
          <AiAdvisorBlock
            loading={aiLoading}
            error={aiError}
            displayedText={displayedText}
            fullText={aiExplanation}
            size="compact"
            errorFallbackLabel={mpMeta.label}
            className="mx-5 mb-4"
          />
        </div>

        {/* ===== STICKY BOTTOM — Buy button always visible ===== */}
        <div className="flex-shrink-0 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-4">
          <Button asChild size="lg" className={cn("w-full", BUY_BUTTON_GRADIENT)}>
            <a
              href={targetUrl}
              target="_blank"
              rel={AFFILIATE_LINK_REL}
              aria-label={`Beli ${product.title} di ${mpMeta.label}`}
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Beli di {mpMeta.label}
              <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
            </a>
          </Button>
          {product.isViral && <ViralUrgencyMessage size="sm" />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
