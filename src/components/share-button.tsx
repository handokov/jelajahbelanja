"use client";

import * as React from "react";
import { Share2, MessageCircle, Facebook, Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ShareButtonProps {
  title: string;
  /** URL produk (otomatis dari window.location kalau tidak diset) */
  url?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

/**
 * ShareButton — share ke WhatsApp, Facebook, atau copy link.
 *
 * Pakai Web Share API kalau available (mobile native), fallback ke dropdown menu.
 */
export function ShareButton({
  title,
  url,
  className,
  variant = "outline",
  size = "sm",
}: ShareButtonProps) {
  const [copied, setCopied] = React.useState(false);

  // Get URL dari window.location kalau tidak diset
  const shareUrl = React.useMemo(() => {
    if (url) return url;
    if (typeof window !== "undefined") return window.location.href;
    return "https://jelajahbelanja.com";
  }, [url]);

  const shareText = `${title} - Lihat di JelajahBelanja`;

  // Web Share API (mobile native)
  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: shareText,
          url: shareUrl,
        });
        return true;
      } catch {
        // User cancel, fallback ke dropdown
        return false;
      }
    }
    return false;
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`${shareText}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleFacebook = () => {
    const u = encodeURIComponent(shareUrl);
    const t = encodeURIComponent(title);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${u}&t=${t}`, "_blank", "noopener,noreferrer");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: create temp input
      const tempInput = document.createElement("input");
      tempInput.value = shareUrl;
      document.body.appendChild(tempInput);
      tempInput.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // silent fail
      }
      document.body.removeChild(tempInput);
    }
  };

  const handleClick = async (e: React.MouseEvent) => {
    // Coba native share dulu (di mobile)
    const shared = await handleNativeShare();
    if (!shared) {
      // Kalau gagal/cancel, biarkan dropdown terbuka (default behavior)
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          aria-label="Share produk"
        >
          <Share2 className="w-3.5 h-3.5 mr-1.5" />
          Bagikan
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleWhatsApp} className="cursor-pointer">
          <MessageCircle className="w-4 h-4 mr-2 text-green-600" />
          <span className="text-sm">WhatsApp</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleFacebook} className="cursor-pointer">
          <Facebook className="w-4 h-4 mr-2 text-blue-600" />
          <span className="text-sm">Facebook</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopy} className="cursor-pointer">
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2 text-emerald-600" />
              <span className="text-sm text-emerald-600">Tersalin!</span>
            </>
          ) : (
            <>
              <Link2 className="w-4 h-4 mr-2" />
              <span className="text-sm">Salin link</span>
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
