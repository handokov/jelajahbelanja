"use client";

import { Sparkles, X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

interface DemoBannerProps {
  className?: string;
}

/**
 * Banner "Mode Demo" yang ditampilkan kalau RAPIDAPI_KEY kosong.
 * Bisa di-dismiss oleh user.
 */
export function DemoBanner({ className }: DemoBannerProps) {
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border border-yellow-300 bg-yellow-100 dark:border-yellow-700 dark:bg-yellow-900/30 px-3 py-2 text-sm text-yellow-900 dark:text-yellow-200",
        className
      )}
      role="status"
    >
      <Sparkles className="w-4 h-4 flex-shrink-0" />
      <p className="flex-1 text-xs md:text-sm">
        <strong className="font-semibold">Mode Demo aktif.</strong>{" "}
        Menampilkan data mock realistic. Set{" "}
        <code className="px-1 py-0.5 rounded bg-yellow-200 dark:bg-yellow-800 text-[11px]">
          RAPIDAPI_KEY
        </code>{" "}
        di environment untuk mengaktifkan AliExpress live.
      </p>
      <button
        type="button"
        aria-label="Tutup banner"
        onClick={() => setDismissed(true)}
        className="p-1 rounded hover:bg-yellow-200 dark:hover:bg-yellow-800/60 transition"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
