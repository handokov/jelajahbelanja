"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Copy,
  Check,
  RefreshCw,
  Loader2,
  Megaphone,
  ExternalLink,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface FlashSaleItem {
  product: {
    id: string;
    title: string;
    price: number;
    originalPrice: number | null;
    discountPercent: number;
    rating: number;
    soldCount: number;
    marketplace: string;
    category: string;
    image: string;
    jbUrl: string;
  };
  content: string;
}

interface FlashSaleResponse {
  success: boolean;
  format: string;
  count: number;
  items: FlashSaleItem[];
  batchContent: string;
}

export function FlashSaleShareTab() {
  const { toast } = useToast();
  const [format, setFormat] = React.useState<"facebook" | "whatsapp" | "telegram">("facebook");
  const [limit, setLimit] = React.useState(5);
  const [copiedItem, setCopiedItem] = React.useState<string | null>(null);
  const [copiedBatch, setCopiedBatch] = React.useState(false);

  const { data, isLoading, error } = useQuery<FlashSaleResponse>({
    queryKey: ["flash-sale-content", format, limit],
    queryFn: async () => {
      const res = await fetch(`/api/admin/flash-sale-content?format=${format}&limit=${limit}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Gagal memuat konten");
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  async function copyToClipboard(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(id);
      toast({ title: "Tersalin!", description: "Konten siap paste ke grup FB/WA" });
      setTimeout(() => setCopiedItem(null), 2000);
    } catch {
      toast({ title: "Gagal copy", variant: "destructive" });
    }
  }

  async function copyBatch() {
    if (!data?.batchContent) return;
    try {
      await navigator.clipboard.writeText(data.batchContent);
      setCopiedBatch(true);
      toast({ title: "Batch tersalin!", description: `${data.count} produk siap paste` });
      setTimeout(() => setCopiedBatch(false), 2000);
    } catch {
      toast({ title: "Gagal copy", variant: "destructive" });
    }
  }

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      {/* Header + controls */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-fuchsia-600" />
            Konten Flash Sale Siap Copy-Paste
          </h2>
          <div className="flex items-center gap-2">
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as any)}
              className="text-xs h-8 px-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-background text-zinc-900 dark:text-zinc-100"
            >
              <option value="facebook">Facebook</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="telegram">Telegram</option>
            </select>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="text-xs h-8 px-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-background text-zinc-900 dark:text-zinc-100"
            >
              <option value={3}>3 produk</option>
              <option value={5}>5 produk</option>
              <option value={7}>7 produk</option>
              <option value={10}>10 produk</option>
            </select>
          </div>
        </div>

        {/* Batch content (semua produk dalam 1 post) */}
        {data?.batchContent && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-500">Batch Copy (semua {data.count} produk sekaligus):</span>
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={copyBatch}>
                {copiedBatch ? <><Check className="w-3 h-3 mr-1 text-green-600" /> Tersalin!</> : <><Copy className="w-3 h-3 mr-1" /> Copy Semua</>}
              </Button>
            </div>
            <pre className="text-xs whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 border border-zinc-200 dark:border-zinc-800 max-h-60 overflow-y-auto font-mono leading-relaxed">
              {data.batchContent}
            </pre>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8 gap-2 text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin text-fuchsia-600" />
            <p className="text-xs">Memuat produk flash sale...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-red-500 text-xs">
            Gagal memuat. Coba refresh.
          </div>
        )}
      </div>

      {/* Individual products */}
      {items.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:p-6">
          <h3 className="font-semibold text-sm mb-4">Per Produk ({items.length})</h3>
          <div className="space-y-3">
            {items.map((item, i) => {
              const p = item.product;
              return (
                <div key={p.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="flex items-start gap-3 mb-2">
                    <img
                      src={p.image}
                      alt={p.title}
                      className="w-14 h-14 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700 flex-shrink-0"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium line-clamp-2">{p.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300">
                          -{p.discountPercent}%
                        </Badge>
                        <span className="text-xs font-bold text-fuchsia-600">Rp{p.price.toLocaleString("id-ID")}</span>
                        {p.originalPrice && (
                          <span className="text-[10px] text-zinc-400 line-through">Rp{p.originalPrice.toLocaleString("id-ID")}</span>
                        )}
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{p.marketplace}</Badge>
                      </div>
                    </div>
                    <a
                      href={p.jbUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-fuchsia-600"
                      title="Lihat di JB"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <pre className="text-[11px] whitespace-pre-wrap bg-white dark:bg-zinc-900 rounded p-2 border border-zinc-200 dark:border-zinc-700 flex-1 max-h-20 overflow-y-auto font-mono leading-snug">
                      {item.content}
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs flex-shrink-0"
                      onClick={() => copyToClipboard(item.content, p.id)}
                    >
                      {copiedItem === p.id ? <><Check className="w-3 h-3 mr-1 text-green-600" /> OK</> : <><Copy className="w-3 h-3 mr-1" /> Copy</>}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 p-4">
        <p className="text-xs text-amber-800 dark:text-amber-200">
          <strong>Tips:</strong> Copy batch content (semua produk) untuk post ke grup FB/WA.
          Atau copy per produk untuk post individu. Format sudah disesuaikan:
          Facebook (engaging), WhatsApp (simple bold), Telegram (markdown).
        </p>
      </div>
    </div>
  );
}
