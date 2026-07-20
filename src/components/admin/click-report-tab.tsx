"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MousePointerClick,
  Users,
  ShieldAlert,
  Percent,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// ════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════

interface ClickReportStats {
  totalClicks: number;
  blockedClicks: number;
  blockRate: string;
  uniqueIPs: number;
  conversionRate: string;
}

interface TopProduct {
  productId: string;
  productTitle: string;
  marketplace: string;
  category: string;
  totalClicks: number;
  uniqueClicks: number;
}

interface DailyStat {
  date: string;
  totalClicks: number;
  uniqueIPs: number;
}

interface MarketplaceStat {
  marketplace: string;
  clicks: number;
}

interface RecentClick {
  id: string;
  productId: string;
  productTitle: string;
  marketplace: string;
  category: string;
  ipAddress: string;
  referer: string | null;
  blocked: boolean;
  blockReason: string | null;
  createdAt: string;
}

interface ClickReportResponse {
  success: boolean;
  range: string;
  marketplace: string;
  stats: ClickReportStats;
  topProducts: TopProduct[];
  dailyStats: DailyStat[];
  byMarketplace: MarketplaceStat[];
  recentClicks: RecentClick[];
}

type RangeValue = "7d" | "30d" | "all";

// ════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════

function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return "baru saja";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} hari lalu`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth} bulan lalu`;
}

function maskIP(ip: string): string {
  if (!ip) return "—";
  const parts = ip.split(".");
  if (parts.length !== 4) return ip; // IPv6 atau format aneh, return as-is
  return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
}

function getMarketplaceColor(m: string): { badge: string; bar: string } {
  switch ((m || "").toLowerCase()) {
    case "shopee":
      return {
        badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
        bar: "bg-orange-500",
      };
    case "tokopedia":
      return {
        badge: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        bar: "bg-green-500",
      };
    case "blibli":
      return {
        badge: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
        bar: "bg-sky-500",
      };
    case "tiktok":
      return {
        badge: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
        bar: "bg-pink-500",
      };
    case "zalora":
      return {
        badge: "bg-zinc-800 text-white dark:bg-zinc-700 dark:text-zinc-100",
        bar: "bg-zinc-700",
      };
    default:
      return {
        badge: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
        bar: "bg-zinc-500",
      };
  }
}

function getMarketplaceEmoji(m: string): string {
  // Emoji dihapus — pakai badge warna saja (lihat getMarketplaceColor)
  return "";
}

function getMarketplaceLabel(m: string): string {
  const map: Record<string, string> = {
    shopee: "Shopee",
    tokopedia: "Tokopedia",
    blibli: "Blibli",
    tiktok: "TikTok Shop",
    zalora: "Zalora",
  };
  return map[(m || "").toLowerCase()] || m || "—";
}

function formatDayLabel(isoDate: string): string {
  // isoDate expected as "YYYY-MM-DD"
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}`;
}

// ════════════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════════════

export function ClickReportTab() {
  const { toast } = useToast();
  const [range, setRange] = React.useState<RangeValue>("7d");
  const [marketplace, setMarketplace] = React.useState<string>("");

  const queryParams = new URLSearchParams();
  queryParams.set("range", range);
  if (marketplace) queryParams.set("marketplace", marketplace);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<ClickReportResponse>({
    queryKey: ["click-report", range, marketplace],
    queryFn: async () => {
      const res = await fetch(`/api/admin/click-report?${queryParams.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "Gagal memuat laporan klik");
      }
      return res.json();
    },
    staleTime: 60 * 1000, // 1 menit
  });

  const stats = data?.stats;
  const topProducts = data?.topProducts ?? [];
  const dailyStats = data?.dailyStats ?? [];
  const byMarketplace = data?.byMarketplace ?? [];
  const recentClicks = data?.recentClicks ?? [];

  const maxDailyClicks = React.useMemo(() => {
    if (dailyStats.length === 0) return 1;
    return Math.max(1, ...dailyStats.map((d) => d.totalClicks));
  }, [dailyStats]);

  const totalMarketplaceClicks = React.useMemo(() => {
    return byMarketplace.reduce((sum, m) => sum + m.clicks, 0);
  }, [byMarketplace]);

  function handleRefresh() {
    refetch();
    toast({ title: "Data direfresh" });
  }

  return (
    <div className="space-y-4">
      {/* ─── 1. Filter bar ─── */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          {/* Date range */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-zinc-500">Rentang Waktu</span>
            <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5 bg-zinc-50 dark:bg-zinc-800/50">
              {([
                { v: "7d", label: "7 Hari" },
                { v: "30d", label: "30 Hari" },
                { v: "all", label: "Semua" },
              ] as const).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setRange(opt.v)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    range === opt.v
                      ? "bg-fuchsia-600 text-white shadow-sm"
                      : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Marketplace filter */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="click-mp-filter" className="text-xs text-zinc-500">
              Marketplace
            </label>
            <select
              id="click-mp-filter"
              value={marketplace}
              onChange={(e) => setMarketplace(e.target.value)}
              className="h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-1 text-sm min-w-[160px]"
            >
              <option value="">Semua Marketplace</option>
              <option value="shopee">Shopee</option>
              <option value="tokopedia">Tokopedia</option>
              <option value="blibli">Blibli</option>
              <option value="tiktok">TikTok Shop</option>
              <option value="zalora">Zalora</option>
            </select>
          </div>

          {/* Auto refresh */}
          <div className="md:ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isFetching}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading || isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Error state ─── */}
      {isError && (
        <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900 dark:text-red-100">
              Gagal memuat laporan klik
            </p>
            <p className="text-xs text-red-900/80 dark:text-red-100/80 mt-0.5">
              {(error as Error)?.message || "Terjadi kesalahan saat fetch data."}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            Coba Lagi
          </Button>
        </div>
      )}

      {/* ─── Loading state ─── */}
      {isLoading && !data && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 text-fuchsia-600 animate-spin" />
          <p className="text-sm text-zinc-500">Memuat laporan klik...</p>
        </div>
      )}

      {/* ─── 2. Stats bar ─── */}
      {data && stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard
            icon={<MousePointerClick className="w-4 h-4" />}
            color="fuchsia"
            label="Total Klik"
            value={stats.totalClicks.toLocaleString("id-ID")}
          />
          <StatCard
            icon={<Users className="w-4 h-4" />}
            color="emerald"
            label="Unique IP"
            value={stats.uniqueIPs.toLocaleString("id-ID")}
          />
          <StatCard
            icon={<ShieldAlert className="w-4 h-4" />}
            color="red"
            label="Blocked"
            value={stats.blockedClicks.toLocaleString("id-ID")}
          />
          <StatCard
            icon={<Percent className="w-4 h-4" />}
            color="amber"
            label="Block Rate"
            value={`${stats.blockRate}%`}
          />
          <StatCard
            icon={<TrendingUp className="w-4 h-4" />}
            color="zinc"
            label="Konversi"
            value={`${stats.conversionRate}%`}
            hint="AT belum sync"
          />
        </div>
      )}

      {/* ─── 3. Top Products ─── */}
      {data && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">
              Produk Paling Banyak Diklik{" "}
              <span className="text-zinc-400 font-normal">({topProducts.length})</span>
            </h3>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 animate-pulse"
                />
              ))}
            </div>
          ) : topProducts.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">
              Belum ada klik tercatat. Data klik akan muncul setelah pengunjung klik &quot;Beli di
              marketplace&quot;.
            </p>
          ) : (
            <div className="max-h-[500px] overflow-y-auto -mx-2 px-2 space-y-2">
              {topProducts.map((p, i) => {
                const colors = getMarketplaceColor(p.marketplace);
                const rankBadge =
                  i < 3
                    ? "bg-fuchsia-600 text-white"
                    : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300";
                return (
                  <div
                    key={`${p.productId}-${i}`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    {/* Rank */}
                    <div
                      className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${rankBadge}`}
                    >
                      {i + 1}
                    </div>

                    {/* Title + badges */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{p.productTitle}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge className={`text-[10px] px-1.5 h-4 ${colors.badge}`}>
                          {getMarketplaceEmoji(p.marketplace)} {getMarketplaceLabel(p.marketplace)}
                        </Badge>
                        {p.category && (
                          <Badge className="bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 text-[10px] px-1.5 h-4">
                            {p.category}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Clicks */}
                    <div className="flex-shrink-0 text-right">
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className="font-bold text-fuchsia-600 text-lg">
                          {p.totalClicks.toLocaleString("id-ID")}
                        </span>
                        <span className="text-[10px] text-zinc-500">klik</span>
                      </div>
                      <p className="text-[10px] text-zinc-500">
                        {p.uniqueClicks.toLocaleString("id-ID")} unique IP
                      </p>
                    </div>

                    {/* Link to product */}
                    <Link
                      href={`/produk/${p.productId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 p-1.5 rounded-md text-zinc-400 hover:text-fuchsia-600 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/30 transition-colors"
                      title="Lihat detail produk"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── 4. Daily Clicks Chart ─── */}
      {data && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:p-6">
          <h3 className="font-semibold text-sm mb-4">Klik per Hari</h3>

          {dailyStats.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">
              Belum ada data klik untuk periode ini.
            </p>
          ) : (
            <div className="flex items-end gap-2 overflow-x-auto pb-2">
              {dailyStats.map((d) => {
                const height = Math.max(4, (d.totalClicks / maxDailyClicks) * 120);
                return (
                  <div
                    key={d.date}
                    className="flex flex-col items-center gap-1 flex-shrink-0"
                    style={{ width: 48 }}
                  >
                    {/* Value above bar */}
                    <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
                      {d.totalClicks}
                    </span>
                    {/* Bar */}
                    <div
                      className="w-7 rounded-t-md bg-gradient-to-t from-fuchsia-600 to-fuchsia-300"
                      style={{ height: `${height}px` }}
                      title={`${d.date}: ${d.totalClicks} klik, ${d.uniqueIPs} unique IP`}
                    />
                    {/* Date below */}
                    <span className="text-[10px] text-zinc-500">{formatDayLabel(d.date)}</span>
                    {/* Unique IPs */}
                    <span className="text-[9px] text-zinc-400">{d.uniqueIPs} IP</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── 5. Marketplace breakdown ─── */}
      {data && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:p-6">
          <h3 className="font-semibold text-sm mb-4">Klik per Marketplace</h3>

          {byMarketplace.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">
              Belum ada data klik per marketplace.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {byMarketplace.map((m) => {
                const colors = getMarketplaceColor(m.marketplace);
                const pct =
                  totalMarketplaceClicks > 0
                    ? (m.clicks / totalMarketplaceClicks) * 100
                    : 0;
                return (
                  <div
                    key={m.marketplace}
                    className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50 dark:bg-zinc-800/50"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base">{getMarketplaceEmoji(m.marketplace)}</span>
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                        {getMarketplaceLabel(m.marketplace)}
                      </span>
                    </div>
                    <p className="font-bold text-lg">{m.clicks.toLocaleString("id-ID")}</p>
                    <p className="text-[10px] text-zinc-500 mb-1.5">{pct.toFixed(1)}% dari total</p>
                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── 6. Recent Clicks log ─── */}
      {data && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">
              Klik Terakhir{" "}
              <span className="text-zinc-400 font-normal">({recentClicks.length})</span>
            </h3>
          </div>

          {recentClicks.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">Belum ada klik tercatat.</p>
          ) : (
            <div className="max-h-[400px] overflow-y-auto -mx-2 px-2">
              {/* Header row (hidden on mobile) */}
              <div className="hidden md:grid grid-cols-12 gap-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wide px-2 py-1 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
                <div className="col-span-2">Waktu</div>
                <div className="col-span-4">Produk</div>
                <div className="col-span-2">Marketplace</div>
                <div className="col-span-2">IP</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1">Referer</div>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {recentClicks.map((c) => {
                  const colors = getMarketplaceColor(c.marketplace);
                  const refererPath = (() => {
                    if (!c.referer) return "—";
                    try {
                      const u = new URL(c.referer);
                      return u.pathname === "/" ? u.host : u.pathname;
                    } catch {
                      return c.referer.length > 30 ? c.referer.slice(0, 30) + "…" : c.referer;
                    }
                  })();
                  return (
                    <div
                      key={c.id}
                      className="grid grid-cols-12 gap-2 px-2 py-2 text-xs items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-md"
                    >
                      {/* Waktu */}
                      <div className="col-span-12 md:col-span-2 text-zinc-600 dark:text-zinc-300">
                        {formatRelativeTime(c.createdAt)}
                      </div>
                      {/* Produk */}
                      <div className="col-span-12 md:col-span-4 min-w-0">
                        <p className="truncate font-medium">{c.productTitle}</p>
                        {c.category && (
                          <p className="text-[10px] text-zinc-500 truncate">{c.category}</p>
                        )}
                      </div>
                      {/* Marketplace */}
                      <div className="col-span-6 md:col-span-2">
                        <Badge className={`text-[10px] px-1.5 h-4 ${colors.badge}`}>
                          {getMarketplaceEmoji(c.marketplace)} {getMarketplaceLabel(c.marketplace)}
                        </Badge>
                      </div>
                      {/* IP */}
                      <div className="col-span-6 md:col-span-2 font-mono text-[10px] text-zinc-600 dark:text-zinc-400">
                        {maskIP(c.ipAddress)}
                      </div>
                      {/* Status */}
                      <div className="col-span-6 md:col-span-1">
                        {c.blocked ? (
                          <Badge
                            className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-[10px] px-1.5 h-4 cursor-help"
                            title={c.blockReason || "Diblokir"}
                          >
                            Blocked
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] px-1.5 h-4">
                            Allowed
                          </Badge>
                        )}
                      </div>
                      {/* Referer */}
                      <div className="col-span-6 md:col-span-1 text-[10px] text-zinc-500 truncate">
                        {refererPath}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// StatCard sub-component
// ════════════════════════════════════════════════════════════════

interface StatCardProps {
  icon: React.ReactNode;
  color: "fuchsia" | "emerald" | "red" | "amber" | "zinc";
  label: string;
  value: string;
  hint?: string;
}

function StatCard({ icon, color, label, value, hint }: StatCardProps) {
  const colorMap: Record<StatCardProps["color"], string> = {
    fuchsia: "text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-900/20",
    emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
    red: "text-red-600 bg-red-50 dark:bg-red-900/20",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
    zinc: "text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300",
  };
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 flex flex-col gap-2">
      <div className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-lg font-bold leading-tight">{value}</p>
        <p className="text-[10px] text-zinc-500">{label}</p>
        {hint && <p className="text-[9px] text-zinc-400 italic">{hint}</p>}
      </div>
    </div>
  );
}
