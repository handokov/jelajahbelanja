"use client";

import * as React from "react";
import { Share2, MessageCircle, Facebook, Link2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  title: string;
  url?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

/**
 * ShareButton — share ke berbagai platform.
 *
 * Behavior:
 * 1. Klik tombol → coba native Web Share API (mobile + Windows desktop)
 *    → native share sheet muncul (WhatsApp, Telegram, Facebook, Twitter, Email, dll — banyak opsi)
 * 2. Kalau native share tidak available (cth: Linux, browser lama) → tampilkan custom dropdown
 *    dengan 3 opsi: WhatsApp, Facebook, Copy link
 */
export function ShareButton({
  title,
  url,
  className,
  variant = "outline",
  size = "sm",
}: ShareButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const shareUrl = React.useMemo(() => {
    if (url) return url;
    if (typeof window !== "undefined") return window.location.href;
    return "https://jelajahbelanja.com";
  }, [url]);

  const shareText = `${title} - Lihat di JelajahBelanja`;

  // Click outside to close dropdown
  React.useEffect(() => {
    if (!showDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  const handleClick = async () => {
    // 1. Coba native Web Share API (mobile + Windows desktop)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: shareText,
          url: shareUrl,
        });
        return; // sukses, tidak perlu dropdown
      } catch (err: any) {
        // User cancel — jangan tampilkan dropdown
        if (err?.name === "AbortError") return;
        // Gagal karena alasan lain → fallback ke dropdown
      }
    }
    // 2. Fallback: tampilkan custom dropdown
    setShowDropdown(!showDropdown);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`${shareText}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
    setShowDropdown(false);
  };

  const handleFacebook = () => {
    const u = encodeURIComponent(shareUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${u}`, "_blank", "noopener,noreferrer");
    setShowDropdown(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowDropdown(false);
      }, 1500);
    } catch {
      const tempInput = document.createElement("input");
      tempInput.value = shareUrl;
      document.body.appendChild(tempInput);
      tempInput.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
          setShowDropdown(false);
        }, 1500);
      } catch {
        // silent fail
      }
      document.body.removeChild(tempInput);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
        aria-label="Share produk"
        aria-expanded={showDropdown}
      >
        <Share2 className="w-3.5 h-3.5 mr-1.5" />
        Bagikan
      </Button>

      {/* Custom dropdown (fallback kalau native share tidak available) */}
      {showDropdown && (
        <div className="absolute bottom-full right-0 mb-2 w-48 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden z-50">
          <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-semibold">Bagikan ke</span>
            <button
              onClick={() => setShowDropdown(false)}
              className="text-zinc-400 hover:text-zinc-600"
              aria-label="Tutup"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={handleWhatsApp}
            className="w-full flex items-center px-3 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-left"
          >
            <MessageCircle className="w-4 h-4 mr-2.5 text-green-600" />
            <span className="text-sm">WhatsApp</span>
          </button>
          <button
            onClick={handleFacebook}
            className="w-full flex items-center px-3 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-left"
          >
            <Facebook className="w-4 h-4 mr-2.5 text-blue-600" />
            <span className="text-sm">Facebook</span>
          </button>
          <button
            onClick={handleCopy}
            className="w-full flex items-center px-3 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-left border-t border-zinc-100 dark:border-zinc-800"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2.5 text-emerald-600" />
                <span className="text-sm text-emerald-600">Tersalin!</span>
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4 mr-2.5" />
                <span className="text-sm">Salin link</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
