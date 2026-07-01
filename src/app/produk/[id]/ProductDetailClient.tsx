"use client";

import * as React from "react";
import {
  Sparkles,
  Star,
  ExternalLink,
  MapPin,
  ArrowLeft,
  ShoppingBag,
  Shirt,
  Share2,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LEGAL_DISCLAIMER, BUY_BUTTON_GRADIENT, AFFILIATE_LINK_REL, MARKETPLACE_META } from "@/lib/config";
import { useTypewriterEffect } from "@/hooks/use-typewriter-effect";
import { AiAdvisorBlock } from "@/components/ai-advisor-block";
import { ViralBadge, DiscountBadge, ViralUrgencyMessage } from "@/components/badges";
import {
  formatRupiah,
  formatSoldCount,
  formatReviewCount,
  cleanMarkdown,
} from "@/lib/format";



export interface ShopeeProduct {
  id: string;
  title: string;
  url: string;
  image: string;
  price: number;
  originalPrice: number | null;
  discountPercent: number | null;
  rating: number;
  reviewCount: number;
  soldCount: number;
  location: string | null;
  category: string;
  marketplace: string;
  isViral: boolean;
  isPinned: boolean;
  isHidden: boolean;
  affiliateUrl: string | null;
  notes: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ─── Simple Recommendation Card ─── */
function RecCard({ product }: { product: ShopeeProduct }) {
  // Gunakan marketplace prefix untuk link detail produk
  const linkId = `${product.marketplace}-${product.id}`;
  return (
    <Link
      href={`/produk/${linkId}`}
      className="flex-shrink-0 w-[150px] text-left bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="relative w-full aspect-square bg-zinc-100 dark:bg-zinc-800">
        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          className="w-full h-full object-cover"
        />
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
      </div>
      <div className="p-2.5">
        <p className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200 line-clamp-2 leading-tight mb-1">
          {product.title}
        </p>
        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">
          {formatRupiah(product.price)}
        </span>
        <div className="flex items-center gap-1 mt-0.5 text-[9px] text-zinc-500">
          <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
          <span>{product.rating.toFixed(1)}</span>
          <span>·</span>
          <span>{formatSoldCount(product.soldCount)}</span>
        </div>
      </div>
    </Link>
  );
}

interface ProductDetailClientProps {
  product: ShopeeProduct;
  related: ShopeeProduct[];
}

export default function ProductDetailClient({ product, related }: ProductDetailClientProps) {
  const [aiExplanation, setAiExplanation] = React.useState("");
  const [outfitTips, setOutfitTips] = React.useState("");
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState(false);
  const [recommendations, setRecommendations] = React.useState<ShopeeProduct[]>([]);
  const [recsLoading, setRecsLoading] = React.useState(false);
  const [shareCopied, setShareCopied] = React.useState(false);

  // Typewriter effect — shared hook
  const { displayedText, isDone: typewriterDone } = useTypewriterEffect(aiExplanation);

  const savings = product.originalPrice ? product.originalPrice - product.price : 0;
  const mpMeta = MARKETPLACE_META[product.marketplace as keyof typeof MARKETPLACE_META] ?? MARKETPLACE_META.mock;

  // Fetch AI explanation + recommendations
  React.useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setAiLoading(true);
      setAiError(false);
      setRecsLoading(true);

      const productPayload = {
        id: `${product.marketplace}-${product.id}`,
        title: product.title,
        url: product.url,
        image: product.image,
        price: product.price,
        originalPrice: product.originalPrice,
        discountPercent: product.discountPercent,
        rating: product.rating,
        reviewCount: product.reviewCount,
        soldCount: product.soldCount,
        location: product.location,
        category: product.category,
        isViral: product.isViral,
        marketplace: product.marketplace,
        soldPerDay: 0,
        timestamp: product.createdAt,
        viralScore: 0,
      };

      const [aiRes, recsRes] = await Promise.allSettled([
        fetch("/api/ai-explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product: productPayload }),
        }),
        fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product: productPayload, limit: 6 }),
        }),
      ]);

      if (!cancelled && aiRes.status === "fulfilled" && aiRes.value.ok) {
        try {
          const data = await aiRes.value.json();
          setAiExplanation(cleanMarkdown(data.explanation || ""));
          setOutfitTips(cleanMarkdown(data.outfitTips || ""));
        } catch {
          if (!cancelled) setAiError(true);
        }
      } else if (!cancelled) {
        setAiError(true);
      }
      if (!cancelled) setAiLoading(false);

      if (!cancelled && recsRes.status === "fulfilled" && recsRes.value.ok) {
        try {
          const data = await recsRes.value.json();
          setRecommendations(data.recommendations || []);
        } catch {
          setRecommendations([]);
        }
      } else if (!cancelled) {
        setRecommendations([]);
      }
      if (!cancelled) setRecsLoading(false);
    }

    fetchData();
    return () => { cancelled = true; };
  }, [product.id, product.title, product.url, product.image, product.price, product.originalPrice, product.discountPercent, product.rating, product.reviewCount, product.soldCount, product.location, product.category, product.isViral, product.createdAt]);

  // (Typewriter effect now handled by useTypewriterEffect hook above)

  async function handleShare() {
    const shareUrl = window.location.href;
    const shareTitle = product.title;
    const shareText = `Cek produk viral ini! ${shareTitle} — ${formatRupiah(product.price)}`;

    // 1. Coba native Share API (mobile: buka share sheet WhatsApp/Telegram/dll)
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        return;
      } catch (err: any) {
        // User cancel share sheet — gak perlu error
        if (err?.name === "AbortError") return;
        // Kalau gagal, fallback ke clipboard
      }
    }

    // 2. Fallback: copy link ke clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // 3. Fallback terakhir: pakai execCommand
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }

  // Combine related (from DB) + recommendations (from API)
  const allRecs = recommendations.length > 0 ? recommendations : related;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky top bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="container mx-auto px-4 max-w-5xl flex items-center justify-between h-12">
          <Link href="/" className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 hover:text-violet-600 dark:hover:text-violet-400 transition">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Kembali</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleShare}>
              {shareCopied ? <ShieldCheck className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-5xl pb-32">
        {/* ===== FOTO KIRI + INFO KANAN (desktop), stacked (mobile) ===== */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 py-5">
          {/* KIRI: Product Image */}
          <div className="md:w-1/2 flex-shrink-0">
            <div className="relative w-full aspect-square md:aspect-[4/5] bg-zinc-100 dark:bg-zinc-800 rounded-2xl overflow-hidden">
              <img
                src={product.image}
                alt={product.title}
                className="w-full h-full object-contain"
              />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-3 left-3 flex gap-1.5">
                {product.isViral && <ViralBadge size="md" />}
                <Badge className={cn(mpMeta.className, "text-xs font-semibold px-2.5 py-1 h-7 shadow-lg")}>
                  {mpMeta.label}
                </Badge>
              </div>
              {product.discountPercent && product.discountPercent > 0 && (
                <div className="absolute top-3 right-3">
                  <DiscountBadge percent={product.discountPercent} size="md" />
                </div>
              )}
            </div>
          </div>

          {/* KANAN: Product Info */}
          <div className="md:w-1/2 flex flex-col">
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-2">
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

            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 leading-snug mb-4">
              {product.title}
            </h1>

            <div className="flex flex-wrap items-end gap-x-3 gap-y-1 mb-4">
              <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                {formatRupiah(product.price)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-base text-zinc-400 line-through mb-0.5">
                  {formatRupiah(product.originalPrice)}
                </span>
              )}
              {savings > 0 && (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs font-bold px-2 py-0.5 h-6 mb-0.5">
                  Hemat {formatRupiah(savings)}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400 mb-5">
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {product.rating.toFixed(1)}
                </span>
              </div>
              <span>{formatReviewCount(product.reviewCount)}</span>
              <span className="font-semibold text-fuchsia-600 dark:text-fuchsia-400">
                {formatSoldCount(product.soldCount)}
              </span>
            </div>

            {/* JB Stylist — Review */}
            <AiAdvisorBlock
              loading={aiLoading}
              error={aiError}
              displayedText={displayedText}
              fullText={aiExplanation}
              size="default"
              label="JB Stylist"
              className="mb-4"
            />

            {/* Style It Up — Outfit Tips (kotak sendiri) */}
            {outfitTips && typewriterDone && (
              <div className="rounded-xl bg-gradient-to-br from-fuchsia-50 to-pink-50 dark:from-fuchsia-950/30 dark:to-pink-950/30 border border-fuchsia-200/60 dark:border-fuchsia-800/30 overflow-hidden mb-4">
                <div className="flex items-center gap-2 px-4 py-3 bg-fuchsia-100/60 dark:bg-fuchsia-900/20 border-b border-fuchsia-200/60 dark:border-fuchsia-800/30">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-fuchsia-600 text-white flex-shrink-0">
                    <Shirt className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-fuchsia-700 dark:text-fuchsia-300">
                    Style It Up!
                  </span>
                </div>
                <div className="px-4 py-4">
                  <div className="text-sm leading-relaxed text-fuchsia-900 dark:text-fuchsia-100 whitespace-pre-wrap">
                    {outfitTips}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recommended Products — full width below */}
        {(allRecs.length > 0 || recsLoading) && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-fuchsia-500" />
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Rekomendasi JB</span>
            </div>

            {recsLoading ? (
              <div className="flex gap-3 overflow-x-auto no-scrollbar">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[150px]">
                    <div className="w-full aspect-square rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                    <div className="p-2.5 space-y-1.5">
                      <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse w-full" />
                      <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {allRecs.map((rec) => (
                  <RecCard key={rec.id} product={rec} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Legal disclaimer */}
      <div className="container mx-auto max-w-5xl px-4 pb-24">
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
          <strong className="text-zinc-500 dark:text-zinc-400">Disclaimer:</strong> {LEGAL_DISCLAIMER}
        </p>
      </div>

      {/* Sticky Bottom — Buy button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-4 py-3">
        <div className="container mx-auto max-w-5xl">
          <Button asChild size="lg" className={cn("w-full h-12 text-base", BUY_BUTTON_GRADIENT)}>
            <a
              href={product.affiliateUrl || `/beli/${product.marketplace}-${product.id}`}
              target="_blank"
              rel={AFFILIATE_LINK_REL}
            >
              <ShoppingBag className="w-5 h-5 mr-2" />
              Beli di {mpMeta.label}
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </Button>
          {product.isViral && <ViralUrgencyMessage size="md" />}
        </div>
      </div>
    </div>
  );
}
