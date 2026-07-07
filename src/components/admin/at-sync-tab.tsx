"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Zap, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface ATCampaign {
  id: number;
  name: string;
  marketplace: string;
  reward: number;
  currency: string;
}

interface ATSyncStatus {
  success: boolean;
  configured: boolean;
  siteId: string;
  campaignsTotal: number;
  campaigns: ATCampaign[];
  error?: string;
}

interface ATSyncResult {
  success: boolean;
  campaignsChecked: number;
  productsFetched: number;
  productsInserted: number;
  productsUpdated: number;
  errors: string[];
  byMarketplace: Record<string, number>;
  duration: number;
}

const MARKETPLACE_LABELS: Record<string, string> = {
  shopee: "🛍️ Shopee",
  tokopedia: "🟢 Tokopedia",
  lazada: "💙 Lazada",
  blibli: "🔷 Blibli",
  bukalapak: "📕 Bukalapak",
  zalora: "👗 Zalora",
  sociolla: "💄 Sociolla",
  aliexpress: "🔴 AliExpress",
  amazon: "📦 Amazon",
  tiktok: "🎵 TikTok Shop",
};

export function AtSyncTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [maxPerCampaign, setMaxPerCampaign] = React.useState(50);
  const [lastResult, setLastResult] = React.useState<ATSyncResult | null>(null);

  // Get status (campaigns list)
  const { data: status, isLoading: statusLoading, refetch } = useQuery<ATSyncStatus>({
    queryKey: ["at-sync-status"],
    queryFn: async () => {
      const res = await fetch("/api/at-sync");
      if (!res.ok) throw new Error("Gagal load status AT");
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async (opts: { dryRun?: boolean }) => {
      const res = await fetch("/api/at-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxPerCampaign,
          dryRun: opts.dryRun,
        }),
      });
      if (!res.ok) throw new Error("Gagal sync");
      return res.json() as Promise<ATSyncResult>;
    },
    onSuccess: (data) => {
      setLastResult(data);
      if (data.success) {
        toast({
          title: data.productsInserted > 0
            ? `✅ Sync berhasil! ${data.productsInserted} produk baru, ${data.productsUpdated} diupdate`
            : `✅ Sync selesai. ${data.productsUpdated} produk diupdate, 0 baru.`,
        });
        queryClient.invalidateQueries({ queryKey: ["products"] });
      } else {
        toast({ title: "Sync selesai dengan error", variant: "destructive" });
      }
    },
    onError: (err: any) => {
      toast({ title: err.message || "Gagal sync", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20 p-4">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 mb-1">
              Sync Produk dari AccessTrade API
            </p>
            <p className="text-xs text-emerald-900/80 dark:text-emerald-100/80">
              Otomatis fetch produk dari campaign AccessTrade yang sudah Anda approved (Shopee, Tokopedia, TikTok Shop, dll).
              Produk langsung masuk ke DB Neon dengan affiliate link resmi AT.
              <strong className="block mt-1">Legal & resmi</strong> — API ini disediakan AT untuk publisher.
            </p>
            <a
              href="https://support.accesstrade.global/api/api-endpoints.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300 hover:underline mt-2"
            >
              Lihat dokumentasi AT API <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Status Koneksi</h3>
          <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={statusLoading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${statusLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {statusLoading ? (
          <p className="text-xs text-zinc-500">Memuat status...</p>
        ) : !status?.success ? (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{status?.error || "Gagal load status AT"}</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-zinc-500">Site ID</p>
                <p className="font-mono">{status.siteId}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Total Campaigns Approved</p>
                <p className="font-bold text-emerald-600">{status.campaignsTotal}</p>
              </div>
            </div>

            {status.campaigns && status.campaigns.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 mb-2">Campaign yang akan disync:</p>
                <div className="flex flex-wrap gap-1.5">
                  {status.campaigns.map((c) => (
                    <Badge key={c.id} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] gap-1">
                      {MARKETPLACE_LABELS[c.marketplace] || c.marketplace}
                      <span className="text-zinc-400">·</span>
                      <span className="text-emerald-600">{c.reward}%</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sync Controls */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
        <h3 className="text-sm font-semibold">Jalankan Sync</h3>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex-1">
            <label className="text-xs text-zinc-500 mb-1 block">Maks produk per campaign</label>
            <input
              type="number"
              min={1}
              max={500}
              value={maxPerCampaign}
              onChange={(e) => setMaxPerCampaign(Math.max(1, Math.min(500, Number(e.target.value) || 50)))}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            />
            <p className="text-[10px] text-zinc-500 mt-1">Rekomendasi: 50-100 per campaign (rate limit AT)</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => syncMutation.mutate({ dryRun: true })}
            disabled={syncMutation.isPending || !status?.success}
          >
            <Zap className="w-3.5 h-3.5 mr-1" />
            Dry Run (preview)
          </Button>
          <Button
            size="sm"
            onClick={() => syncMutation.mutate({ dryRun: false })}
            disabled={syncMutation.isPending || !status?.success}
          >
            {syncMutation.isPending ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 mr-1" />
                Sync Sekarang
              </>
            )}
          </Button>
        </div>

        {syncMutation.isPending && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-xs text-blue-700 dark:text-blue-300">
            ⏳ Syncing... Mohon tunggu. Bisa makan 1-3 menit tergantung jumlah campaign & produk.
          </div>
        )}
      </div>

      {/* Last Result */}
      {lastResult && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
          <div className="flex items-center gap-2">
            {lastResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <h3 className="text-sm font-semibold">Hasil Sync Terakhir</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-zinc-500">Campaigns Checked</p>
              <p className="font-bold">{lastResult.campaignsChecked}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Products Fetched</p>
              <p className="font-bold">{lastResult.productsFetched}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Inserted (baru)</p>
              <p className="font-bold text-emerald-600">{lastResult.productsInserted}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Updated</p>
              <p className="font-bold text-blue-600">{lastResult.productsUpdated}</p>
            </div>
          </div>

          {Object.keys(lastResult.byMarketplace).length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 mb-1">Per Marketplace:</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(lastResult.byMarketplace).map(([mp, count]) => (
                  <Badge key={mp} className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-[10px]">
                    {MARKETPLACE_LABELS[mp] || mp}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {lastResult.errors.length > 0 && (
            <div>
              <p className="text-xs text-red-500 mb-1">Errors ({lastResult.errors.length}):</p>
              <div className="max-h-40 overflow-y-auto text-[10px] text-red-600 space-y-1">
                {lastResult.errors.slice(0, 20).map((err, i) => (
                  <div key={i} className="font-mono bg-red-50 dark:bg-red-900/20 p-1.5 rounded">
                    {err}
                  </div>
                ))}
                {lastResult.errors.length > 20 && (
                  <p className="text-zinc-500">+ {lastResult.errors.length - 20} error lainnya</p>
                )}
              </div>
            </div>
          )}

          <p className="text-[10px] text-zinc-500">Duration: {(lastResult.duration / 1000).toFixed(2)}s</p>
        </div>
      )}
    </div>
  );
}
