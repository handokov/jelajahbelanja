"use client";

import * as React from "react";
import { Shield, ShieldAlert, ShieldCheck, Eye, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClickLog {
  ip: string;
  productId: string;
  timestamp: number;
  blocked: boolean;
  reason?: string;
}

interface ClickStats {
  totalClicks: number;
  blockedClicks: number;
  blockRate: string;
  uniqueIPs: number;
  recentClicks: number;
  recentBlocked: number;
  currentlyBlocked: number;
  topIPs: Array<{ ip: string; clicks: number }>;
  recentLogs: ClickLog[];
}

export function SecurityTab({ adminFetch }: { adminFetch: (url: string, options?: RequestInit) => Promise<Response> }) {
  const [stats, setStats] = React.useState<ClickStats | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchStats = React.useCallback(async () => {
    try {
      const res = await adminFetch("/api/click-stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  React.useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading) {
    return <div className="text-center py-8 text-sm text-zinc-500">Memuat statistik keamanan...</div>;
  }

  if (!stats) {
    return <div className="text-center py-8 text-sm text-zinc-500">Gagal memuat statistik</div>;
  }

  return (
    <div className="space-y-4">
      {/* Info box */}
      <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20 p-4">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>Proteksi Click Fraud Aktif</strong> — Sistem otomatis mendeteksi dan memblokir bot, autoclick, dan klik berulang yang mencurigakan pada link affiliate. IP yang melanggar diblokir selama 30 menit.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard icon={<Eye className="w-5 h-5" />} label="Total Klik" value={stats.totalClicks.toLocaleString("id-ID")} color="blue" />
        <KPICard icon={<Ban className="w-5 h-5" />} label="Diblokir" value={stats.blockedClicks.toLocaleString("id-ID")} subtitle={`${stats.blockRate}% block rate`} color="red" />
        <KPICard icon={<ShieldAlert className="w-5 h-5" />} label="IP Diblokir" value={String(stats.currentlyBlocked)} color="amber" />
        <KPICard icon={<ShieldCheck className="w-5 h-5" />} label="Klik/menit" value={String(stats.recentClicks)} subtitle={`${stats.recentBlocked} blocked`} color="green" />
      </div>

      {/* Proteksi Rules */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-fuchsia-500" />
          Aturan Proteksi Aktif
        </h3>
        <div className="space-y-2">
          <RuleItem title="Bot Detection" desc="Block user-agent bot, headless browser, dan autoclick tools" active />
          <RuleItem title="Rate Limit Global" desc="Max 15 klik per IP per menit — block 30 menit kalau lewat" active />
          <RuleItem title="Per-Product Throttle" desc="Max 3 klik per IP per produk per jam — cegah klik berulang" active />
          <RuleItem title="Auto-Block IP" desc="IP yang melanggar otomatis diblokir selama 30 menit" active />
        </div>
      </div>

      {/* Top IPs */}
      {stats.topIPs.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Top IP (klik terbanyak)</h3>
          <div className="space-y-1">
            {stats.topIPs.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800">
                <span className="font-mono text-zinc-700 dark:text-zinc-300">{item.ip}</span>
                <span className={cn("font-semibold", item.clicks > 50 ? "text-red-500" : item.clicks > 20 ? "text-amber-500" : "text-zinc-500")}>
                  {item.clicks} klik
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Logs */}
      {stats.recentLogs.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Log Klik Terbaru</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="text-left py-2 px-2">Waktu</th>
                  <th className="text-left py-2 px-2">IP</th>
                  <th className="text-left py-2 px-2">Produk</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Alasan</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentLogs.slice(0, 30).map((log, i) => (
                  <tr key={i} className="border-b border-zinc-50 dark:border-zinc-800/50">
                    <td className="py-1.5 px-2 text-zinc-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString("id-ID")}</td>
                    <td className="py-1.5 px-2 font-mono text-zinc-700 dark:text-zinc-300">{log.ip}</td>
                    <td className="py-1.5 px-2 text-zinc-500 truncate max-w-[100px]">{log.productId.slice(0, 8)}...</td>
                    <td className="py-1.5 px-2">{log.blocked ? <span className="text-red-500 font-semibold">Blocked</span> : <span className="text-emerald-500">OK</span>}</td>
                    <td className="py-1.5 px-2 text-zinc-400">{log.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="text-center">
        <button onClick={fetchStats} className="text-xs text-zinc-400 hover:text-fuchsia-500 transition">Refresh statistik</button>
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, subtitle, color }: {
  icon: React.ReactNode; label: string; value: string; subtitle?: string; color: "blue" | "red" | "amber" | "green";
}) {
  const colors = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50",
    red: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50",
    green: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50",
  };
  return (
    <div className={cn("rounded-xl border p-3", colors[color])}>
      <div className="flex items-center gap-1.5 mb-1">{icon}<span className="text-[10px] font-medium opacity-70">{label}</span></div>
      <p className="text-xl font-bold">{value}</p>
      {subtitle && <p className="text-[10px] opacity-60">{subtitle}</p>}
    </div>
  );
}

function RuleItem({ title, desc, active }: { title: string; desc: string; active: boolean }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", active ? "bg-emerald-500" : "bg-zinc-300")} />
      <div>
        <p className="font-medium text-zinc-900 dark:text-zinc-100">{title}</p>
        <p className="text-xs text-zinc-500">{desc}</p>
      </div>
    </div>
  );
}
