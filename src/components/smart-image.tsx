"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Aspect ratio class, cth: "aspect-square" */
  aspectClass?: string;
  /** Loading strategy: lazy (default) atau eager (above-the-fold) */
  loading?: "lazy" | "eager";
  /** Prioritas untuk LCP image */
  priority?: boolean;
}

/**
 * SmartImage — image dengan lazy load + skeleton placeholder + error fallback.
 *
 * Fitur:
 * - Skeleton gradient saat loading
 * - Fade-in animation saat image loaded
 * - Fallback ke placeholder SVG kalau image error
 * - Lazy load by default (priority=true untuk above-the-fold)
 * - Object-contain untuk product images (tidak crop)
 */
export function SmartImage({
  src,
  alt,
  className,
  aspectClass = "aspect-square",
  loading = "lazy",
  priority = false,
}: SmartImageProps) {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);

  return (
    <div className={cn("relative overflow-hidden bg-zinc-100 dark:bg-zinc-800", aspectClass, className)}>
      {/* Skeleton shimmer saat loading */}
      {!loaded && !error && (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 via-zinc-200 to-zinc-100 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800 animate-pulse" />
      )}

      {/* Error fallback */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-300 dark:text-zinc-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-10 h-10"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
            />
          </svg>
        </div>
      )}

      {/* Actual image */}
      {!error && (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : loading}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            "w-full h-full object-contain transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
            "group-hover:scale-105 transition-transform duration-500"
          )}
        />
      )}
    </div>
  );
}
