"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Banner {
  image: string;
  title: string;
  subtitle?: string;
  linkUrl?: string;
  linkLabel?: string;
  bgColor?: string;
}

interface BannerSliderProps {
  banners: Banner[];
}

/**
 * BannerSlider — promo banner dengan auto-slide, nav arrows, dan dots.
 */
export function BannerSlider({ banners }: BannerSliderProps) {
  const [bannerIdx, setBannerIdx] = React.useState(0);
  const bannerIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Auto-slide
  React.useEffect(() => {
    if (banners.length <= 1) return;
    bannerIntervalRef.current = setInterval(() => {
      setBannerIdx((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => {
      if (bannerIntervalRef.current) clearInterval(bannerIntervalRef.current);
    };
  }, [banners.length]);

  if (banners.length === 0) return null;

  return (
    <section aria-label="Banner promo" className="mb-6">
      <div className="relative rounded-2xl overflow-hidden">
        {/* Current banner */}
        <a
          href={banners[bannerIdx]?.linkUrl || undefined}
          target={banners[bannerIdx]?.linkUrl ? "_blank" : undefined}
          rel={banners[bannerIdx]?.linkUrl ? "noopener noreferrer" : undefined}
          className="block relative aspect-[3/1] md:aspect-[4/1] overflow-hidden rounded-2xl"
          style={{ backgroundColor: banners[bannerIdx]?.bgColor || "#7c3aed" }}
        >
          <img
            src={banners[bannerIdx].image}
            alt={banners[bannerIdx].title}
            className="w-full h-full object-cover"
          />
          {/* Text overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent flex flex-col justify-center px-6 md:px-10">
            <h3 className="text-white font-bold text-lg md:text-2xl drop-shadow-lg mb-1">
              {banners[bannerIdx].title}
            </h3>
            {banners[bannerIdx].subtitle && (
              <p className="text-white/90 text-sm md:text-base drop-shadow">
                {banners[bannerIdx].subtitle}
              </p>
            )}
            {banners[bannerIdx].linkLabel && (
              <span className="mt-2 inline-block bg-white text-zinc-900 text-xs md:text-sm font-semibold px-4 py-1.5 rounded-full shadow-lg">
                {banners[bannerIdx].linkLabel}
              </span>
            )}
          </div>
        </a>

        {/* Nav arrows */}
        {banners.length > 1 && (
          <>
            <button
              onClick={() => setBannerIdx((bannerIdx - 1 + banners.length) % banners.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition"
              aria-label="Banner sebelumnya"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setBannerIdx((bannerIdx + 1) % banners.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition"
              aria-label="Banner berikutnya"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            {/* Dots */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {banners.map((_: any, i: number) => (
                <button
                  key={i}
                  onClick={() => setBannerIdx(i)}
                  className={cn(
                    "w-2 h-2 rounded-full transition",
                    i === bannerIdx ? "bg-white w-4" : "bg-white/50"
                  )}
                  aria-label={`Banner ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
