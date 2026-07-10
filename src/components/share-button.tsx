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

  const handleTwitter = () => {
    const text = encodeURIComponent(shareText);
    const url = encodeURIComponent(shareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank", "noopener,noreferrer");
    setShowDropdown(false);
  };

  const handleTelegram = () => {
    const text = encodeURIComponent(shareText);
    const url = encodeURIComponent(shareUrl);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank", "noopener,noreferrer");
    setShowDropdown(false);
  };

  const handleThreads = () => {
    // Threads tidak punya share URL API resmi, pakai text + URL copy
    const text = encodeURIComponent(`${shareText}\n\n${shareUrl}`);
    window.open(`https://www.threads.net/intent/post?text=${text}`, "_blank", "noopener,noreferrer");
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
        <div className="absolute bottom-full right-0 mb-2 w-56 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden z-50">
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
            onClick={handleTwitter}
            className="w-full flex items-center px-3 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-left"
          >
            <svg className="w-4 h-4 mr-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            <span className="text-sm">X (Twitter)</span>
          </button>
          <button
            onClick={handleTelegram}
            className="w-full flex items-center px-3 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-left"
          >
            <svg className="w-4 h-4 mr-2.5 text-sky-500" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.329-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            <span className="text-sm">Telegram</span>
          </button>
          <button
            onClick={handleThreads}
            className="w-full flex items-center px-3 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-left"
          >
            <svg className="w-4 h-4 mr-2.5 text-zinc-700 dark:text-zinc-300" viewBox="0 0 24 24" fill="currentColor"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.781 3.631 2.695 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.358-.218-3.255-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.444 7.4c.96-1.444 2.522-2.224 4.388-2.224h.043c3.156.02 5.041 1.972 5.296 5.452.137.057.274.118.411.182 1.86.868 3.204 2.211 3.884 3.884.735 1.809.567 4.166-.441 6.026-1.05 1.939-2.86 3.046-5.377 3.296-.408.041-.821.061-1.232.061zm-1.142-10.182c-.32 0-.65.012-.982.037-1.892.108-3.117.927-3.042 2.052.078 1.152 1.453 1.683 2.764 1.613 1.18-.064 2.682-.548 2.947-3.518a9.972 9.972 0 0 0-1.687-.184z"/></svg>
            <span className="text-sm">Threads</span>
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
