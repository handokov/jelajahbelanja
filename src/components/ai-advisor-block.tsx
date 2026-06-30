"use client";

import * as React from "react";
import {
  Bot,
  Loader2,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AiAdvisorBlock — komponen shared buat nampilin AI analysis di produk.
 *
 * Sebelumnya: UI block identik duplikat di product-detail-dialog.tsx & ProductDetailClient.tsx.
 * Sekarang: satu komponen dengan prop `size` buat compact vs default.
 *
 * Props:
 * - loading      — apakah AI masih loading
 * - error        — apakah fetch gagal
 * - displayedText — teks yang udah di-type oleh typewriter effect
 * - fullText     — teks penuh (buat cek apakah typewriter selesai)
 * - size         — "compact" (dialog) atau "default" (detail page)
 * - label        — judul block, default "JB AI Advisor"
 * - errorFallbackLabel — nama marketplace buat error message fallback
 * - className    — extra class buat outer wrapper
 */
interface AiAdvisorBlockProps {
  loading: boolean;
  error: boolean;
  displayedText: string;
  fullText: string;
  size?: "compact" | "default";
  label?: string;
  errorFallbackLabel?: string;
  className?: string;
}

export function AiAdvisorBlock({
  loading,
  error,
  displayedText,
  fullText,
  size = "default",
  label = "JB AI Advisor",
  errorFallbackLabel,
  className,
}: AiAdvisorBlockProps) {
  const isCompact = size === "compact";
  const typewriterDone = fullText && displayedText === fullText;

  // Size-dependent classes
  const iconWrapperSize = isCompact ? "w-6 h-6" : "w-7 h-7";
  const iconSize = isCompact ? "w-3.5 h-3.5" : "w-4 h-4";
  const loaderSize = isCompact ? "w-3 h-3" : "w-3.5 h-3.5";
  const checkSize = isCompact ? "w-3 h-3" : "w-3.5 h-3.5";
  const headerPad = isCompact ? "py-2.5" : "py-3";
  const titleText = isCompact ? "text-xs" : "text-sm";
  const contentText = isCompact ? "text-[13px]" : "text-sm";
  const loadingText = isCompact ? "text-xs" : "text-sm";
  const skeletonH = isCompact ? "h-3" : "h-3.5";
  const skeletonGap = isCompact ? "gap-2" : "gap-2.5";
  const skeletonSpace = isCompact ? "space-y-1.5" : "space-y-2";
  const LoadingIcon = isCompact ? Zap : Sparkles;
  const contentPad = isCompact ? "py-3" : "py-4";

  return (
    <div
      className={cn(
        "rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30 border border-violet-200/60 dark:border-violet-800/30 overflow-hidden",
        className,
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center gap-2 px-4 border-b border-violet-200/60 dark:border-violet-800/30 bg-violet-100/60 dark:bg-violet-900/20",
        headerPad,
      )}>
        <div className={cn(
          "flex items-center justify-center rounded-full bg-violet-600 text-white flex-shrink-0",
          iconWrapperSize,
        )}>
          <Bot className={iconSize} />
        </div>
        <span className={cn("font-semibold text-violet-700 dark:text-violet-300", titleText)}>
          {label}
        </span>
        {loading && (
          <Loader2 className={cn("animate-spin text-violet-500 flex-shrink-0", loaderSize)} />
        )}
        {typewriterDone && (
          <ShieldCheck className={cn("text-emerald-500 flex-shrink-0", checkSize)} />
        )}
      </div>

      {/* Content */}
      <div className={cn("px-4 min-h-[60px]", contentPad)}>
        {loading && !fullText ? (
          <div className={cn("flex flex-col", skeletonGap)}>
            <div className={cn("flex items-center gap-2 text-violet-600 dark:text-violet-400", loadingText)}>
              <LoadingIcon className={cn("animate-pulse", iconSize)} />
              <span>JB lagi analisis produk ini...</span>
            </div>
            <div className={skeletonSpace}>
              <div className={cn("bg-violet-200/50 dark:bg-violet-800/30 rounded-full animate-pulse w-full", skeletonH)} />
              <div className={cn("bg-violet-200/50 dark:bg-violet-800/30 rounded-full animate-pulse w-4/5", skeletonH)} />
              <div className={cn("bg-violet-200/50 dark:bg-violet-800/30 rounded-full animate-pulse w-3/5", skeletonH)} />
            </div>
          </div>
        ) : error ? (
          <div className={cn("text-violet-600 dark:text-violet-400", loadingText)}>
            <p>JB lagi istirahat sebentar{errorFallbackLabel ? "" : ", tapi produk ini tetap worth it buat dicek!"}</p>
            {errorFallbackLabel && (
              <p className="mt-1 text-zinc-500">
                Tapi produk ini tetap worth it buat dicek langsung di {errorFallbackLabel}!
              </p>
            )}
          </div>
        ) : (
          <div className={cn("leading-relaxed text-violet-900 dark:text-violet-100 whitespace-pre-wrap", contentText)}>
            {displayedText}
            {!typewriterDone && fullText && (
              <span className="inline-block w-0.5 h-4 bg-violet-500 animate-pulse ml-0.5 align-text-bottom" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
