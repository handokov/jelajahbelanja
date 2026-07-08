"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Zap, CheckCircle2, AlertCircle, ExternalLink, Save } from "lucide-react";
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

  // Auto-affiliate mutation (untuk produk Shopee yang belum punya affiliate URL AT)
  const [lastAffResult, setLastAffResult] = React.useState<any>(null);
  const affiliateMutation = useMutation({
    mutationFn: async (opts: { dryRun?: boolean }) => {
      const res = await fetch("/api/at-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "affiliate-shopee",
          dryRun: opts.dryRun,
        }),
      });
      if (!res.ok) throw new Error("Gagal affiliate");
      return res.json();
    },
    onSuccess: (data) => {
      setLastAffResult(data);
      if (data.success) {
        toast({
          title: data.dryRun
            ? `Preview: ${data.scanned} produk Shopee siap di-affiliate`
            : `✅ ${data.updated} produk Shopee dapat affiliate URL AT!`,
        });
        queryClient.invalidateQueries({ queryKey: ["products"] });
      } else {
        toast({ title: "Affiliate gagal", variant: "destructive" });
      }
    },
    onError: (err: any) => {
      toast({ title: err.message || "Gagal affiliate", variant: "destructive" });
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

      {/* AT Credentials Form — set via DB, bypass Vercel env vars issue */}
      <AtCredentialsForm />

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

      {/* Auto-Affiliate Shopee Section */}
      <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Zap className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Auto-Affiliate Produk Shopee
            </h3>
            <p className="text-xs text-amber-900/70 dark:text-amber-100/70 mt-1">
              Scan semua produk Shopee yang belum punya affiliate URL AccessTrade → generate otomatis pakai AT Quicklink.
              Setiap klik "Beli Sekarang" akan tercatat di AT → komisi masuk.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => affiliateMutation.mutate({ dryRun: true })}
            disabled={affiliateMutation.isPending || !status?.success}
            className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-300"
          >
            <Zap className="w-3.5 h-3.5 mr-1" />
            Preview (cek berapa produk)
          </Button>
          <Button
            size="sm"
            onClick={() => affiliateMutation.mutate({ dryRun: false })}
            disabled={affiliateMutation.isPending || !status?.success}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {affiliateMutation.isPending ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 mr-1" />
                Affiliate Shopee Sekarang
              </>
            )}
          </Button>
        </div>

        {affiliateMutation.isPending && (
          <div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-2 text-xs text-amber-700 dark:text-amber-300">
            ⏳ Generating affiliate URLs... Mohon tunggu.
          </div>
        )}

        {/* Affiliate Result */}
        {lastAffResult && (
          <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-zinc-900 p-3 space-y-2">
            <div className="flex items-center gap-2">
              {lastAffResult.success ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-red-600" />
              )}
              <span className="text-xs font-semibold">Hasil Auto-Affiliate Shopee</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-zinc-500 text-[10px]">Scanned</p>
                <p className="font-bold">{lastAffResult.scanned}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-[10px]">Updated</p>
                <p className="font-bold text-emerald-600">{lastAffResult.updated}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-[10px]">Skipped</p>
                <p className="font-bold text-zinc-400">{lastAffResult.skipped}</p>
              </div>
            </div>
            {lastAffResult.errors && lastAffResult.errors.length > 0 && (
              <div className="text-[10px] text-red-600">
                {lastAffResult.errors.length} error(s)
              </div>
            )}
            <p className="text-[10px] text-zinc-500">
              Duration: {(lastAffResult.duration / 1000).toFixed(2)}s
            </p>
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

// ════════════════════════════════════════════════════════════════
// AtCredentialsForm — form untuk set AT credentials via DB
// Bypass Vercel env vars copy-paste issue
// ════════════════════════════════════════════════════════════════
function AtCredentialsForm() {
  const { toast } = useToast();
  const [form, setForm] = React.useState({
    USER_UID: "",
    SECRET_KEY: "",
    API_BASE: "https://gurkha.accesstrade.global",
    COUNTRY_CODE: "id",
    SITE_ID: "127377",
  });
  const [currentCreds, setCurrentCreds] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Load current credentials (masked)
  const loadCreds = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/at-settings");
      if (res.ok) {
        const data = await res.json();
        setCurrentCreds(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadCreds();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/at-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast({ title: "✅ AT credentials saved ke DB" });
        loadCreds();
      } else {
        toast({ title: "Gagal save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Gagal save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-violet-200 dark:border-violet-900/50 bg-violet-50 dark:bg-violet-900/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-violet-900 dark:text-violet-100">
          AT Credentials (DB-backed)
        </h3>
        <Button size="sm" variant="ghost" onClick={loadCreds} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      <p className="text-xs text-violet-900/70 dark:text-violet-100/70">
        Set credentials AT di sini (disimpan di DB Neon, bukan Vercel env vars).
        Bypass issue copy-paste Vercel dashboard yang terpotong.
      </p>

      {/* Current credentials status */}
      {currentCreds && (
        <div className="rounded-lg bg-white dark:bg-zinc-900 p-2.5 text-[10px] font-mono space-y-1">
          <div className="flex justify-between">
            <span className="text-zinc-500">USER_UID:</span>
            <span className={currentCreds.USER_UID.includes("(not set)") ? "text-red-500" : "text-emerald-600"}>
              {currentCreds.USER_UID}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">SECRET_KEY:</span>
            <span className={currentCreds.SECRET_KEY.includes("(not set)") ? "text-red-500" : "text-emerald-600"}>
              {currentCreds.SECRET_KEY}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">API_BASE:</span>
            <span>{currentCreds.API_BASE}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">SITE_ID:</span>
            <span>{currentCreds.SITE_ID}</span>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-zinc-500">USER_UID (32 chars)</label>
          <Input
            placeholder="uu738972tut4t3t16s0vswssss219864"
            value={form.USER_UID}
            onChange={(e) => setForm({ ...form, USER_UID: e.target.value })}
            className="h-8 text-xs font-mono"
          />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500">SECRET_KEY (32 chars)</label>
          <Input
            placeholder="p1vlmk0000i0ot01mnunwnsnkwlvuwss"
            value={form.SECRET_KEY}
            onChange={(e) => setForm({ ...form, SECRET_KEY: e.target.value })}
            className="h-8 text-xs font-mono"
          />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500">API_BASE</label>
          <Input
            value={form.API_BASE}
            onChange={(e) => setForm({ ...form, API_BASE: e.target.value })}
            className="h-8 text-xs font-mono"
          />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500">COUNTRY_CODE</label>
          <Input
            value={form.COUNTRY_CODE}
            onChange={(e) => setForm({ ...form, COUNTRY_CODE: e.target.value })}
            className="h-8 text-xs font-mono"
          />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500">SITE_ID</label>
          <Input
            value={form.SITE_ID}
            onChange={(e) => setForm({ ...form, SITE_ID: e.target.value })}
            className="h-8 text-xs font-mono"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving || (!form.USER_UID && !form.SECRET_KEY)}>
          <Save className="w-3.5 h-3.5 mr-1" />
          {saving ? "Saving..." : "Save ke DB"}
        </Button>
        {form.USER_UID && (
          <span className={`text-[10px] ${form.USER_UID.length === 32 ? "text-emerald-600" : "text-red-500"}`}>
            USER_UID: {form.USER_UID.length}/32 chars
          </span>
        )}
        {form.SECRET_KEY && (
          <span className={`text-[10px] ${form.SECRET_KEY.length === 32 ? "text-emerald-600" : "text-red-500"}`}>
            SECRET_KEY: {form.SECRET_KEY.length}/32 chars
          </span>
        )}
      </div>
    </div>
  );
}
