"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  Save,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { AffiliateTagDTO, UpdateAffiliateTagInput, Marketplace } from "@/lib/types";
import { AFFILIATE_INFO } from "@/lib/admin-config";

export function AffiliateTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ─── State ───
  const [affDrafts, setAffDrafts] = React.useState<Record<string, { tag: string; enabled: boolean }>>({});

  // ─── Query ───
  const { data: affiliateData, isLoading: affiliateLoading } = useQuery({
    queryKey: ["affiliate-tags"],
    queryFn: async () => {
      const res = await fetch("/api/affiliate");
      if (!res.ok) throw new Error("Gagal memuat tag affiliate");
      const json = await res.json();
      return json.tags as AffiliateTagDTO[];
    },
    staleTime: 60 * 1000,
  });

  // Sync affiliate data to drafts
  React.useEffect(() => {
    if (affiliateData) {
      const drafts: Record<string, { tag: string; enabled: boolean }> = {};
      for (const t of affiliateData) {
        drafts[t.marketplace] = { tag: t.tag, enabled: t.enabled };
      }
      setAffDrafts(drafts);
    }
  }, [affiliateData]);

  // ─── Mutations ───
  const updateAffiliateMutation = useMutation({
    mutationFn: async (input: UpdateAffiliateTagInput) => {
      const res = await fetch("/api/affiliate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Gagal menyimpan tag affiliate"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affiliate-tags"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Tag affiliate disimpan" });
    },
    onError: (err: Error) => { toast({ title: "Gagal", description: err.message, variant: "destructive" }); },
  });

  const resetAffiliateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/affiliate?reset=true", { method: "POST" });
      if (!res.ok) throw new Error("Gagal reset tag affiliate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affiliate-tags"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Tag affiliate direset" });
    },
  });

  // ─── Handlers ───
  function handleSaveAffiliate(m: Marketplace) {
    const draft = affDrafts[m];
    if (!draft) return;
    updateAffiliateMutation.mutate({ marketplace: m, tag: draft.tag, enabled: draft.enabled });
  }

  return (
    <>
      <div className="rounded-2xl border border-fuchsia-200 dark:border-fuchsia-900/50 bg-fuchsia-50 dark:bg-fuchsia-900/20 p-4">
        <p className="text-sm text-fuchsia-900 dark:text-fuchsia-100">
          <strong>Cara kerja:</strong> Setelah tag affiliate terisi, semua link &quot;Beli Sekarang&quot; di JelajahBelanja otomatis disisipi parameter tracking Anda. Setiap transaksi yang berasal dari link ini akan memberikan komisi ke Anda.
        </p>
      </div>
      {affiliateLoading ? (
        <div className="text-center py-8 text-sm text-zinc-500">Memuat...</div>
      ) : (
        <div className="flex flex-col gap-3">
          {AFFILIATE_INFO.map((m) => {
            const draft = affDrafts[m.id] ?? { tag: "", enabled: false };
            const isSaved = affiliateData?.find((t) => t.marketplace === m.id)?.tag === draft.tag &&
              affiliateData?.find((t) => t.marketplace === m.id)?.enabled === draft.enabled;
            return (
              <div key={m.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{m.label}</span>
                    {draft.tag && draft.enabled && (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-[10px]">
                        <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Aktif
                      </Badge>
                    )}
                  </div>
                  <a href={m.signupUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-fuchsia-600 dark:text-fuchsia-400 hover:underline inline-flex items-center gap-0.5">
                    Daftar <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">{m.hint}</p>
                <div className="flex items-center gap-2">
                  <code className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">?{m.param}=</code>
                  <Input placeholder={`Tag ${m.label} Anda`} value={draft.tag} onChange={(e) => setAffDrafts({ ...affDrafts, [m.id]: { ...draft, tag: e.target.value } })} className="h-9 text-sm" />
                  <Switch checked={draft.enabled} onCheckedChange={(checked) => setAffDrafts({ ...affDrafts, [m.id]: { ...draft, enabled: checked } })} />
                  <Button size="sm" variant={isSaved ? "outline" : "default"} onClick={() => handleSaveAffiliate(m.id)} disabled={updateAffiliateMutation.isPending} className="h-9">
                    <Save className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-3">
        <Button variant="outline" size="sm" onClick={() => resetAffiliateMutation.mutate()} disabled={resetAffiliateMutation.isPending}>
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset Semua Tag
        </Button>
      </div>
    </>
  );
}
