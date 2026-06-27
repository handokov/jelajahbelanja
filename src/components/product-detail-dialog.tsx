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
import {
  formatRupiah,
  formatSoldCount,
  formatReviewCount,
} from "@/lib/format";

const MARKETPLACE_META: Record<Marketplace, { label: string; className: string; color: string }> = {
  shopee: { label: "Shopee", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300", color: "text-orange-500" },
  tokopedia: { label: "Tokopedia", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", color: "text-green-500" },
  lazada: { label: "Lazada", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", color: "text-blue-500" },
  aliexpress: { label: "AliExpress", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", color: "text-red-500" },
  amazon: { label: "Amazon", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300", color: "text-yellow-600" },
  mock: { label: "Demo", className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300", color: "text-zinc-500" },
};

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
      i += 2; // 2 chars at a time for speed
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
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        {/* Close button */}
        <DialogTitle className="sr-only">{product.title}</DialogTitle>
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 z-10 rounded-full bg-black/30 backdrop-blur-sm p-1.5 text-white hover:bg-black/50 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Product image */}
        <div className="relative w-full aspect-video overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover"
          />
          {/* Overlay badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.isViral && (
              <Badge className="bg-yellow-400 text-yellow-950 hover:bg-yellow-400 text-[10px] font-bold px-2 py-0.5 h-6 animate-pulse shadow-lg">
                <Sparkles className="w-3 h-3 mr-1" />
                VIRAL
              </Badge>
            )}
            <Badge className={cn(mpMeta.className, "text-[10px] font-semibold px-2 py-0.5 h-6 shadow-lg")}>
              {mpMeta.label}
            </Badge>
          </div>
          {product.discountPercent && product.discountPercent > 0 && (
            <Badge className="absolute top-3 right-12 bg-red-500 text-white hover:bg-red-500 text-sm font-bold px-2.5 py-0.5 h-7 shadow-lg">
              −{product.discountPercent}%
            </Badge>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
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
          <div className="flex items-end gap-2 mb-3">
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
          <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400 mb-1">
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
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-600 text-white">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">
              JB AI Advisor
            </span>
            {aiLoading && (
              <Loader2 className="w-3 h-3 animate-spin text-violet-500" />
            )}
            {typewriterDone && (
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
            )}
          </div>

          {/* AI content */}
          <div className="px-4 py-3 min-h-[80px]">
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
                <p className="mt-1 text-zinc-500 dark:text-zinc-500">
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

        {/* Action buttons */}
        <div className="px-5 pb-5 flex flex-col gap-2">
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
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-fuchsia-600 dark:text-fuchsia-400">
              <TrendingUp className="w-3 h-3" />
              <span className="font-medium">Produk viral — stok terbatas, buruan!</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Need ShoppingBag icon for the button
function ShoppingBag({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
