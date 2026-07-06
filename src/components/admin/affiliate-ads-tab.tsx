"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Trash2,
  Pencil,
  Save,
  ImageIcon,
  ExternalLink,
  Megaphone,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Ukuran banner preset
const BANNER_SIZES = [
  { label: "300x250 (Sidebar Rectangle)", width: 300, height: 250 },
  { label: "728x90 (Leaderboard)", width: 728, height: 90 },
  { label: "160x600 (Skyscraper)", width: 160, height: 600 },
  { label: "320x100 (Mobile Banner)", width: 320, height: 100 },
  { label: "1200x400 (Hero Slider)", width: 1200, height: 400 },
  { label: "Custom", width: 0, height: 0 },
];

const PLATFORMS = [
  { value: "accesstrade", label: "AccessTrade" },
  { value: "shopee", label: "Shopee Affiliate" },
  { value: "tokopedia", label: "Tokopedia Affiliate" },
  { value: "tiktok", label: "TikTok Shop" },
  { value: "lazada", label: "Lazada Affiliate" },
  { value: "lainnya", label: "Lainnya" },
];

const POSITIONS = [
  { value: "sidebar", label: "Sidebar" },
  { value: "header", label: "Header" },
  { value: "footer", label: "Footer" },
  { value: "in-content", label: "In Content" },
];

interface AffiliateAdForm {
  name: string;
  platform: string;
  href: string;
  imgSrc: string;
  trackingPixel: string;
  width: number;
  height: number;
  position: string;
  order: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

const EMPTY_FORM: AffiliateAdForm = {
  name: "",
  platform: "accesstrade",
  href: "",
  imgSrc: "",
  trackingPixel: "",
  width: 300,
  height: 250,
  position: "sidebar",
  order: "0",
  isActive: true,
  startDate: "",
  endDate: "",
};

export function AffiliateAdsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // State
  const [form, setForm] = React.useState<AffiliateAdForm>(EMPTY_FORM);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<any>(null);
  const [sizePreset, setSizePreset] = React.useState("300x250 (Sidebar Rectangle)");

  // Query
  const { data: adsData, isLoading } = useQuery({
    queryKey: ["affiliate-ads"],
    queryFn: async () => {
      const res = await fetch("/api/affiliate-ads");
      if (!res.ok) throw new Error("Gagal memuat affiliate ads");
      const json = await res.json();
      return json.ads as any[];
    },
    staleTime: 30 * 1000,
  });

  // Handlers
  const handleSizeChange = (preset: string) => {
    setSizePreset(preset);
    const size = BANNER_SIZES.find((s) => s.label === preset);
    if (size && size.width > 0) {
      setForm((prev) => ({ ...prev, width: size.width, height: size.height }));
    }
  };

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name: form.name,
        platform: form.platform,
        href: form.href,
        imgSrc: form.imgSrc,
        trackingPixel: form.trackingPixel || null,
        width: form.width,
        height: form.height,
        position: form.position,
        order: Number(form.order) || 0,
        isActive: form.isActive,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };
      if (editingId) {
        payload.id = editingId;
        const res = await fetch("/api/affiliate-ads", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Gagal update affiliate ad");
        return res.json();
      } else {
        const res = await fetch("/api/affiliate-ads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Gagal buat affiliate ad");
        return res.json();
      }
    },
    onSuccess: () => {
      toast({ title: editingId ? "Affiliate ad diperbarui" : "Affiliate ad dibuat" });
      setForm(EMPTY_FORM);
      setEditingId(null);
      setSizePreset("300x250 (Sidebar Rectangle)");
      queryClient.invalidateQueries({ queryKey: ["affiliate-ads"] });
      queryClient.invalidateQueries({ queryKey: ["active-affiliate-ads"] });
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/affiliate-ads?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal hapus affiliate ad");
    },
    onSuccess: () => {
      toast({ title: "Affiliate ad dihapus" });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["affiliate-ads"] });
      queryClient.invalidateQueries({ queryKey: ["active-affiliate-ads"] });
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const ads = adsData ?? [];

  return (
    <>
      {/* Info */}
      <div className="rounded-2xl border border-fuchsia-200 dark:border-fuchsia-900/50 bg-fuchsia-50 dark:bg-fuchsia-900/20 p-4">
        <p className="text-sm font-semibold text-fuchsia-900 dark:text-fuchsia-100 mb-1">
          <Megaphone className="w-4 h-4 inline mr-1" />
          Kelola Banner Affiliate (AccessTrade, Shopee, dll)
        </p>
        <p className="text-xs text-fuchsia-900/80 dark:text-fuchsia-100/80">
          Upload banner dari AccessTrade atau platform affiliate lain. Isi link affiliate dan tracking pixel dari dashboard.
        </p>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          {editingId ? (
            <>
              <Pencil className="w-3.5 h-3.5" /> Edit Affiliate Ad
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" /> Tambah Banner Affiliate
            </>
          )}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Nama */}
          <div>
            <Label className="text-xs">Nama Banner *</Label>
            <Input
              placeholder="cth: AccessTrade 300x250 Promo"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          {/* Platform */}
          <div>
            <Label className="text-xs">Platform</Label>
            <Select
              value={form.platform}
              onValueChange={(v) => setForm({ ...form, platform: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih platform" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Link Affiliate */}
          <div className="md:col-span-2">
            <Label className="text-xs font-semibold flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Link Affiliate (href) *
            </Label>
            <Input
              placeholder="https://accesstrade.co.id/xxxxx (link dari dashboard)"
              value={form.href}
              onChange={(e) => setForm({ ...form, href: e.target.value })}
            />
          </div>
          {/* Banner Image */}
          <div className="md:col-span-2">
            <Label className="text-xs font-semibold flex items-center gap-1">
              <ImageIcon className="w-3 h-3" /> URL Gambar Banner (imgSrc) *
            </Label>
            <Input
              placeholder="https://accesstrade.co.id/xxxxx_300x250.jpg (URL gambar)"
              value={form.imgSrc}
              onChange={(e) => setForm({ ...form, imgSrc: e.target.value })}
            />
            {form.imgSrc && (
              <img
                src={form.imgSrc}
                alt="Preview"
                className="mt-2 max-w-[200px] rounded-lg object-contain bg-zinc-100 dark:bg-zinc-800"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
          </div>
          {/* Tracking Pixel */}
          <div className="md:col-span-2">
            <Label className="text-xs">Tracking Pixel URL (opsional)</Label>
            <Input
              placeholder="https://imp.accesstra.de/img.php?rk=xxxxx (1x1 pixel)"
              value={form.trackingPixel}
              onChange={(e) => setForm({ ...form, trackingPixel: e.target.value })}
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              Tracking pixel 1x1 untuk impression tracking (invisible)
            </p>
          </div>
          {/* Ukuran Preset */}
          <div>
            <Label className="text-xs">Ukuran Banner</Label>
            <Select value={sizePreset} onValueChange={handleSizeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih ukuran" />
              </SelectTrigger>
              <SelectContent>
                {BANNER_SIZES.map((s) => (
                  <SelectItem key={s.label} value={s.label}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Position */}
          <div>
            <Label className="text-xs">Posisi</Label>
            <Select
              value={form.position}
              onValueChange={(v) => setForm({ ...form, position: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih posisi" />
              </SelectTrigger>
              <SelectContent>
                {POSITIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Custom Width/Height */}
          {sizePreset === "Custom" && (
            <>
              <div>
                <Label className="text-xs">Lebar (px)</Label>
                <Input
                  type="number"
                  value={form.width}
                  onChange={(e) =>
                    setForm({ ...form, width: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Tinggi (px)</Label>
                <Input
                  type="number"
                  value={form.height}
                  onChange={(e) =>
                    setForm({ ...form, height: Number(e.target.value) || 0 })
                  }
                />
              </div>
            </>
          )}
          {/* Order */}
          <div>
            <Label className="text-xs">Urutan</Label>
            <Input
              type="number"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: e.target.value })}
            />
          </div>
          {/* Active */}
          <div className="flex items-center gap-2 pt-5">
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => setForm({ ...form, isActive: v })}
            />
            <Label className="text-xs">Aktif</Label>
          </div>
          {/* Start/End Date */}
          <div>
            <Label className="text-xs">Mulai Tayang</Label>
            <Input
              type="datetime-local"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Selesai Tayang</Label>
            <Input
              type="datetime-local"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>
        </div>
        {/* Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={
              saveMutation.isPending ||
              !form.name ||
              !form.href ||
              !form.imgSrc
            }
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            {editingId ? "Simpan" : "Tambah"}
          </Button>
          {editingId && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY_FORM);
                setSizePreset("300x250 (Sidebar Rectangle)");
              }}
            >
              Batal
            </Button>
          )}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-xs text-zinc-500">Memuat affiliate ads...</p>
      ) : ads.length === 0 ? (
        <div className="text-center py-8 text-sm text-zinc-500">
          <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-40" />
          Belum ada banner affiliate. Tambahkan di atas.
        </div>
      ) : (
        <div className="space-y-3">
          {ads.map((ad: any) => (
            <div
              key={ad.id}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
            >
              <div className="flex gap-3 p-3">
                <div
                  className="w-24 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"
                >
                  {ad.imgSrc ? (
                    <img
                      src={ad.imgSrc}
                      alt={ad.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-zinc-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate">
                      {ad.name}
                    </span>
                    {!ad.isActive && (
                      <Badge className="bg-zinc-200 text-zinc-600 text-[9px]">
                        Nonaktif
                      </Badge>
                    )}
                    {ad.isActive && (
                      <Badge className="bg-emerald-100 text-emerald-700 text-[9px]">
                        Aktif
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">
                    {ad.platform} • {ad.width}x{ad.height} • {ad.position}
                  </p>
                  {ad.trackingPixel && (
                    <p className="text-[10px] text-fuchsia-600 mt-0.5 truncate">
                      Tracking: {ad.trackingPixel}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => {
                      setEditingId(ad.id);
                      setForm({
                        name: ad.name,
                        platform: ad.platform || "accesstrade",
                        href: ad.href,
                        imgSrc: ad.imgSrc,
                        trackingPixel: ad.trackingPixel || "",
                        width: ad.width,
                        height: ad.height,
                        position: ad.position || "sidebar",
                        order: String(ad.order ?? 0),
                        isActive: ad.isActive,
                        startDate: ad.startDate
                          ? new Date(ad.startDate).toISOString().slice(0, 16)
                          : "",
                        endDate: ad.endDate
                          ? new Date(ad.endDate).toISOString().slice(0, 16)
                          : "",
                      });
                      // Set size preset based on width/height
                      const matchingSize = BANNER_SIZES.find(
                        (s) => s.width === ad.width && s.height === ad.height
                      );
                      setSizePreset(matchingSize?.label || "Custom");
                    }}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-red-500"
                    onClick={() => setDeleteTarget(ad)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus affiliate ad?</AlertDialogTitle>
            <AlertDialogDescription>
              Banner <strong>{deleteTarget?.name}</strong> akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget.id)
              }
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}