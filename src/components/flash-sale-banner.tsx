"use client";

import * as React from "react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import {
  Zap,
  TrendingDown,
  Flame,
  Eye,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Banner data ─── */
const banners: BannerSlide[] = [
  {
    id: 1,
    gradient: "from-rose-600 via-red-500 to-orange-500",
    badge: "FLASH SALE",
    badgeIcon: Zap,
    headline: "Temukan Produk Diskon Hingga 90%",
    subline: "Kami kumpulkan produk dengan potongan harga terbesar dari berbagai marketplace — semua di satu tempat!",
    cta: "Lihat Diskon Terbesar",
    accent: "bg-yellow-400 text-red-700",
    icon: Flame,
  },
  {
    id: 2,
    gradient: "from-violet-700 via-purple-600 to-fuchsia-500",
    badge: "HARGA TERMURAH",
    badgeIcon: TrendingDown,
    headline: "Bandingkan Harga, Pilih Terendah",
    subline: "Satu produk bisa beda harga di tiap marketplace — kami bantu cari yang paling murah buat kamu!",
    cta: "Cek Perbandingan Harga",
    accent: "bg-white text-purple-700",
    icon: Search,
  },
  {
    id: 3,
    gradient: "from-emerald-600 via-teal-500 to-cyan-500",
    badge: "PRODUK VIRAL",
    badgeIcon: Flame,
    headline: "Lagi Trending? Pasti Ketemu Di Sini",
    subline: "Ribuan produk viral yang lagi diburu netizen — update real-time, jangan sampai kehabisan!",
    cta: "Lacak Produk Viral",
    accent: "bg-emerald-100 text-emerald-800",
    icon: Eye,
  },
  {
    id: 4,
    gradient: "from-amber-500 via-orange-500 to-red-500",
    badge: "PROMO HARI INI",
    badgeIcon: Zap,
    headline: "Kurasi Promo Terbaik Hari Ini",
    subline: "Setiap hari kami pilihin produk dengan promo paling worth it — diskon besar, harga turun, stok terbatas!",
    cta: "Cek Promo Hari Ini",
    accent: "bg-amber-100 text-amber-800",
    icon: Sparkles,
  },
  {
    id: 5,
    gradient: "from-blue-600 via-indigo-500 to-violet-600",
    badge: "BEST SELLER",
    badgeIcon: TrendingDown,
    headline: "Paling Laris Di Semua Marketplace",
    subline: "Produk yang paling banyak dibeli orang — proof-nya dari ribuan review dan rating tinggi!",
    cta: "Lihat Best Seller",
    accent: "bg-blue-100 text-blue-800",
    icon: Eye,
  },
];

interface BannerSlide {
  id: number;
  gradient: string;
  badge: string;
  badgeIcon: React.ComponentType<{ className?: string }>;
  headline: string;
  subline: string;
  cta: string;
  accent: string;
  icon: React.ComponentType<{ className?: string }>;
}

/* ─── Component ─── */
export function FlashSaleBanner({ className }: { className?: string }) {
  const plugin = React.useRef(
    Autoplay({ delay: 4000, stopOnInteraction: true, stopOnMouseEnter: true })
  );

  const [api, setApi] = React.useState<ReturnType<typeof Object> | null>(null);
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      setCurrent((api as { selectedScrollSnap: () => number }).selectedScrollSnap());
    };
    (api as { on: (event: string, cb: () => void) => void }).on("select", onSelect);
    onSelect();
  }, [api]);

  return (
    <section aria-label="Banner promo flash sale" className={cn("w-full", className)}>
      <Carousel
        setApi={(api) => setApi(api as never)}
        opts={{ loop: true, align: "start" }}
        plugins={[plugin.current]}
        className="w-full"
      >
        <CarouselContent className="-ml-0">
          {banners.map((slide, idx) => {
            const Icon = slide.icon;
            const BadgeIcon = slide.badgeIcon;
            return (
              <CarouselItem key={slide.id} className="pl-0 basis-full">
                <div
                  className={cn(
                    "relative overflow-hidden rounded-2xl",
                    "bg-gradient-to-r",
                    slide.gradient,
                    "min-h-[140px] sm:min-h-[160px] md:min-h-[180px]",
                    "flex items-center",
                    "px-5 sm:px-8 md:px-12 py-5 sm:py-6"
                  )}
                >
                  {/* Decorative circles */}
                  <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-sm" />
                  <div className="absolute right-16 -bottom-10 w-32 h-32 rounded-full bg-white/5 blur-md" />
                  <div className="absolute left-1/3 -top-4 w-20 h-20 rounded-full bg-white/5 blur-sm" />

                  <div className="relative z-10 flex items-center gap-4 sm:gap-6 md:gap-10 w-full">
                    {/* Icon circle */}
                    <div className="hidden sm:flex flex-shrink-0 items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/20">
                      <Icon className="w-8 h-8 md:w-10 md:h-10 text-white drop-shadow-lg" />
                    </div>

                    {/* Text content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                        <BadgeIcon className="w-3.5 h-3.5 text-yellow-300" />
                        <span className="text-[11px] sm:text-xs font-bold tracking-wider text-white/90 uppercase">
                          {slide.badge}
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl md:text-2xl font-extrabold text-white leading-tight mb-1 sm:mb-1.5">
                        {slide.headline}
                      </h3>
                      <p className="text-xs sm:text-sm text-white/80 leading-relaxed max-w-lg mb-2.5 sm:mb-3 line-clamp-2">
                        {slide.subline}
                      </p>
                      <button
                        type="button"
                        className={cn(
                          "inline-flex items-center gap-1.5 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-lg hover:scale-105 active:scale-95 transition-transform",
                          slide.accent
                        )}
                      >
                        {slide.cta}
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {banners.map((_, idx) => (
          <button
            key={idx}
            type="button"
            aria-label={`Slide ${idx + 1}`}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              idx === current
                ? "w-6 bg-primary"
                : "w-1.5 bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-500"
            )}
          />
        ))}
      </div>
    </section>
  );
}
