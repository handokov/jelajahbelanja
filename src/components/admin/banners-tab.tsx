"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  Upload,
  ImageIcon,
  Image as ImageLucide,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { EMPTY_BANNER, type BannerFormInput } from "@/lib/admin-config";

export function BannersTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ─── State ───
  const [bannerForm, setBannerForm] = React.useState<BannerFormInput>(EMPTY_BANNER);
  const [editingBannerId, setEditingBannerId] = React.useState<string | null>(null);
  const [deleteBannerTarget, setDeleteBannerTarget] = React.useState<any>(null);
  const [bannerUploading, setBannerUploading] = React.useState(false);

  // ─── Query ───
  const { data: bannersData, isLoading: bannersLoading } = useQuery({
    queryKey: ["banners"],
    queryFn: async () => {
      const res = await fetch("/api/banners");
      if (!res.ok) throw new Error("Gagal memuat banner");
      const json = await res.json();
      return json.banners as any[];
    },
    staleTime: 30 * 1000,
  });

  // ─── Handlers ───
  const handleBannerImageUpload = React.useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Hanya file gambar yang diperbolehkan", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Ukuran file maksimal 5MB", variant: "destructive" });
      return;
    }
    setBannerUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (uploadRes.ok) {
        const { url } = await uploadRes.json();
        setBannerForm((prev) => ({ ...prev, image: url }));
        toast({ title: "Gambar berhasil diupload!" });
      } else {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const img = document.createElement("img");
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const maxW = 1200, maxH = 400;
              let w = img.width, h = img.height;
              if (w > maxW) { h = h * maxW / w; w = maxW; }
              if (h > maxH) { w = w * maxH / h; h = maxH; }
              canvas.width = w; canvas.height = h;
              canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
              resolve(canvas.toDataURL("image/jpeg", 0.85));
            };
            img.src = reader.result as string;
          };
          reader.readAsDataURL(file);
        });
        setBannerForm((prev) => ({ ...prev, image: dataUrl }));
        toast({ title: "Gambar berhasil dimuat (mode lokal)" });
      }
    } catch (err) {
      toast({ title: "Gagal mengupload gambar", variant: "destructive" });
    } finally {
      setBannerUploading(false);
    }
  }, [toast]);

  // ─── Mutations ───
  const saveBannerMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        title: bannerForm.title,
        subtitle: bannerForm.subtitle || null,
        image: bannerForm.image,
        linkUrl: bannerForm.linkUrl || null,
        linkLabel: bannerForm.linkLabel || null,
        bgColor: bannerForm.bgColor || "#7c3aed",
        order: Number(bannerForm.order) || 0,
        isActive: bannerForm.isActive,
        startDate: bannerForm.startDate || null,
        endDate: bannerForm.endDate || null,
      };
      if (editingBannerId) {
        payload.id = editingBannerId;
        const res = await fetch("/api/banners", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error("Gagal update banner");
        return res.json();
      } else {
        const res = await fetch("/api/banners", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error("Gagal buat banner");
        return res.json();
      }
    },
    onSuccess: () => {
      toast({ title: editingBannerId ? "Banner diperbarui" : "Banner dibuat" });
      setBannerForm(EMPTY_BANNER);
      setEditingBannerId(null);
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      queryClient.invalidateQueries({ queryKey: ["active-banners"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteBannerMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/banners?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal hapus banner");
    },
    onSuccess: () => {
      toast({ title: "Banner dihapus" });
      setDeleteBannerTarget(null);
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      queryClient.invalidateQueries({ queryKey: ["active-banners"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const banners = bannersData ?? [];

  return (
    <>
      {/* Info */}
      <div className="rounded-2xl border border-violet-200 dark:border-violet-900/50 bg-violet-50 dark:bg-violet-900/20 p-4">
        <p className="text-sm font-semibold text-violet-900 dark:text-violet-100 mb-1">
          Kelola Banner Promo
        </p>
        <p className="text-xs text-violet-900/80 dark:text-violet-100/80">
          Banner muncul di homepage sebagai slider. Upload gambar landscape (disarankan 1200x400px). Atur tanggal mulai & selesai untuk auto-tayang.
        </p>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          {editingBannerId ? <><Pencil className="w-3.5 h-3.5" /> Edit Banner</> : <><Plus className="w-3.5 h-3.5" /> Tambah Banner Baru</>}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Judul Banner *</Label>
            <Input placeholder="cth: Flash Sale Akhir Tahun" value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Sub Judul</Label>
            <Input placeholder="cth: Diskon sampai 70%" value={bannerForm.subtitle} onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs font-semibold flex items-center gap-1 mb-1">
              <ImageIcon className="w-3 h-3" /> Gambar Banner * (disarankan 1200x400px)
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://... paste URL gambar di sini"
                value={bannerForm.image}
                onChange={(e) => setBannerForm({ ...bannerForm, image: e.target.value })}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={bannerUploading}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleBannerImageUpload(file);
                  };
                  input.click();
                }}
              >
                {bannerUploading ? (
                  <><div className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" /></>
                ) : (
                  <><Upload className="w-3.5 h-3.5 mr-1" /> Upload</>
                )}
              </Button>
            </div>
            {bannerForm.image && (
              <img
                src={bannerForm.image}
                alt="Preview"
                className="mt-2 h-20 rounded-lg object-contain bg-zinc-100 dark:bg-zinc-800"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
          </div>
          <div>
            <Label className="text-xs">Link Tujuan</Label>
            <Input placeholder="https://... (opsional)" value={bannerForm.linkUrl} onChange={(e) => setBannerForm({ ...bannerForm, linkUrl: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Text Tombol</Label>
            <Input placeholder="cth: Belanja Sekarang" value={bannerForm.linkLabel} onChange={(e) => setBannerForm({ ...bannerForm, linkLabel: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Warna Background</Label>
            <div className="flex gap-2 items-center">
              <input type="color" value={bannerForm.bgColor} onChange={(e) => setBannerForm({ ...bannerForm, bgColor: e.target.value })} className="w-9 h-9 rounded border cursor-pointer" />
              <Input value={bannerForm.bgColor} onChange={(e) => setBannerForm({ ...bannerForm, bgColor: e.target.value })} className="flex-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Urutan</Label>
            <Input type="number" value={bannerForm.order} onChange={(e) => setBannerForm({ ...bannerForm, order: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Mulai Tayang</Label>
            <Input type="datetime-local" value={bannerForm.startDate} onChange={(e) => setBannerForm({ ...bannerForm, startDate: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Selesai Tayang</Label>
            <Input type="datetime-local" value={bannerForm.endDate} onChange={(e) => setBannerForm({ ...bannerForm, endDate: e.target.value })} />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <Switch checked={bannerForm.isActive} onCheckedChange={(v) => setBannerForm({ ...bannerForm, isActive: v })} />
            <Label className="text-xs">Aktif</Label>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={() => saveBannerMutation.mutate()} disabled={saveBannerMutation.isPending || bannerUploading || !bannerForm.title || !bannerForm.image}>
            <Save className="w-3.5 h-3.5 mr-1" /> {editingBannerId ? "Simpan" : "Tambah"}
          </Button>
          {editingBannerId && (
            <Button size="sm" variant="outline" onClick={() => { setEditingBannerId(null); setBannerForm(EMPTY_BANNER); }}>Batal</Button>
          )}
        </div>
      </div>

      {/* List */}
      {bannersLoading ? (
        <p className="text-xs text-zinc-500">Memuat banner...</p>
      ) : banners.length === 0 ? (
        <div className="text-center py-8 text-sm text-zinc-500">
          <ImageLucide className="w-8 h-8 mx-auto mb-2 opacity-40" />
          Belum ada banner. Tambahkan di atas.
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((b: any) => (
            <div key={b.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
              <div className="flex gap-3 p-3">
                <div className="w-32 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  {b.image && <img src={b.image} alt={b.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate">{b.title}</span>
                    {!b.isActive && <Badge className="bg-zinc-200 text-zinc-600 text-[9px]">Nonaktif</Badge>}
                    {b.isActive && <Badge className="bg-emerald-100 text-emerald-700 text-[9px]">Aktif</Badge>}
                  </div>
                  {b.subtitle && <p className="text-xs text-zinc-500 truncate">{b.subtitle}</p>}
                  {b.linkLabel && <p className="text-[10px] text-violet-600 mt-0.5">Tombol: {b.linkLabel}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                    setEditingBannerId(b.id);
                    setBannerForm({
                      title: b.title,
                      subtitle: b.subtitle || "",
                      image: b.image,
                      linkUrl: b.linkUrl || "",
                      linkLabel: b.linkLabel || "",
                      bgColor: b.bgColor || "#7c3aed",
                      order: String(b.order ?? 0),
                      isActive: b.isActive,
                      startDate: b.startDate ? new Date(b.startDate).toISOString().slice(0, 16) : "",
                      endDate: b.endDate ? new Date(b.endDate).toISOString().slice(0, 16) : "",
                    });
                  }}><Pencil className="w-3 h-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setDeleteBannerTarget(b)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete banner dialog */}
      <AlertDialog open={!!deleteBannerTarget} onOpenChange={(o) => !o && setDeleteBannerTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus banner?</AlertDialogTitle>
            <AlertDialogDescription>
              Banner <strong>{deleteBannerTarget?.title}</strong> akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteBannerTarget && deleteBannerMutation.mutate(deleteBannerTarget.id)} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Section 2: Banner Kecil Produk (per marketplace) ─── */}
      <ProductBadgesSection />
    </>
  );
}

// ════════════════════════════════════════════════════════════════
// ProductBadgesSection — banner kecil di bawah foto produk, per marketplace
// ════════════════════════════════════════════════════════════════

interface ProductBadgeFormInput {
  label: string;
  emoji: string;
  bgColor: string;
  textColor: string;
  marketplaces: string[]; // array of marketplace codes
  order: string;
  isActive: boolean;
}

const EMPTY_BADGE: ProductBadgeFormInput = {
  label: "",
  emoji: "",
  bgColor: "#ef4444",
  textColor: "#ffffff",
  marketplaces: ["shopee"],
  order: "0",
  isActive: true,
};

const MARKETPLACE_OPTIONS: { value: string; label: string; emoji: string }[] = [
  { value: "shopee", label: "Shopee", emoji: "🛍️" },
  { value: "tokopedia", label: "Tokopedia", emoji: "🟢" },
  { value: "lazada", label: "Lazada", emoji: "💙" },
  { value: "blibli", label: "Blibli", emoji: "🔷" },
  { value: "bukalapak", label: "Bukalapak", emoji: "📕" },
  { value: "zalora", label: "Zalora", emoji: "👗" },
  { value: "sociolla", label: "Sociolla", emoji: "💄" },
  { value: "aliexpress", label: "AliExpress", emoji: "🔴" },
  { value: "amazon", label: "Amazon", emoji: "📦" },
  { value: "tiktok", label: "TikTok Shop", emoji: "🎵" },
];

function ProductBadgesSection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [badgeForm, setBadgeForm] = React.useState<ProductBadgeFormInput>(EMPTY_BADGE);
  const [editingBadgeId, setEditingBadgeId] = React.useState<string | null>(null);
  const [deleteBadgeTarget, setDeleteBadgeTarget] = React.useState<any>(null);
  const [customMarketplaceInput, setCustomMarketplaceInput] = React.useState("");

  // ─── Query ───
  const { data: badgesData, isLoading: badgesLoading } = useQuery({
    queryKey: ["product-badges"],
    queryFn: async () => {
      const res = await fetch("/api/product-badges");
      if (!res.ok) throw new Error("Gagal memuat product badges");
      const json = await res.json();
      return json.badges as any[];
    },
  });
  const badges = badgesData ?? [];

  // ─── Mutations ───
  const saveBadgeMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        label: badgeForm.label,
        emoji: badgeForm.emoji || null,
        bgColor: badgeForm.bgColor,
        textColor: badgeForm.textColor,
        marketplaces: badgeForm.marketplaces.join(","),
        order: Number(badgeForm.order) || 0,
        isActive: badgeForm.isActive,
      };
      if (editingBadgeId) {
        const res = await fetch(`/api/product-badges?id=${editingBadgeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Gagal update badge");
        return res.json();
      } else {
        const res = await fetch("/api/product-badges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Gagal buat badge");
        return res.json();
      }
    },
    onSuccess: () => {
      toast({ title: editingBadgeId ? "Badge diperbarui" : "Badge dibuat" });
      setBadgeForm(EMPTY_BADGE);
      setEditingBadgeId(null);
      queryClient.invalidateQueries({ queryKey: ["product-badges"] });
    },
    onError: () => toast({ title: "Gagal menyimpan badge", variant: "destructive" }),
  });

  const deleteBadgeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/product-badges?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal hapus badge");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Badge dihapus" });
      setDeleteBadgeTarget(null);
      queryClient.invalidateQueries({ queryKey: ["product-badges"] });
    },
    onError: () => toast({ title: "Gagal menghapus badge", variant: "destructive" }),
  });

  const toggleMarketplace = (mp: string) => {
    setBadgeForm((prev) => ({
      ...prev,
      marketplaces: prev.marketplaces.includes(mp)
        ? prev.marketplaces.filter((m) => m !== mp)
        : [...prev.marketplaces, mp],
    }));
  };

  const addCustomMarketplace = () => {
    const val = customMarketplaceInput.trim().toLowerCase().replace(/\s+/g, "");
    if (!val) return;
    if (badgeForm.marketplaces.includes(val)) {
      toast({ title: `${val} sudah ada di daftar` });
      return;
    }
    setBadgeForm((prev) => ({ ...prev, marketplaces: [...prev.marketplaces, val] }));
    setCustomMarketplaceInput("");
  };

  return (
    <>
      {/* Info */}
      <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 p-4">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
          Kelola Banner Kecil Produk (per Marketplace)
        </p>
        <p className="text-xs text-amber-900/80 dark:text-amber-100/80">
          Banner kecil muncul di bawah foto produk di homepage. Setiap badge bisa di-assign ke marketplace tertentu (Shopee, Tokopedia, dll). Contoh: &quot;Flash Sale&quot; untuk Shopee, &quot;Promo Guncang 7.7&quot; untuk Tokopedia.
        </p>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          {editingBadgeId ? <><Pencil className="w-3.5 h-3.5" /> Edit Badge</> : <><Plus className="w-3.5 h-3.5" /> Tambah Badge Baru</>}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Label Badge *</Label>
            <Input placeholder="cth: Flash Sale, Promo Guncang 7.7, Gratis Ongkir" value={badgeForm.label} onChange={(e) => setBadgeForm({ ...badgeForm, label: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Emoji (opsional)</Label>
            <Input placeholder="cth: 🔥, 🚚, 💵" value={badgeForm.emoji} onChange={(e) => setBadgeForm({ ...badgeForm, emoji: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Warna Background</Label>
            <div className="flex gap-2 items-center">
              <input type="color" value={badgeForm.bgColor} onChange={(e) => setBadgeForm({ ...badgeForm, bgColor: e.target.value })} className="w-9 h-9 rounded border cursor-pointer" />
              <Input value={badgeForm.bgColor} onChange={(e) => setBadgeForm({ ...badgeForm, bgColor: e.target.value })} className="flex-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Warna Text</Label>
            <div className="flex gap-2 items-center">
              <input type="color" value={badgeForm.textColor} onChange={(e) => setBadgeForm({ ...badgeForm, textColor: e.target.value })} className="w-9 h-9 rounded border cursor-pointer" />
              <Input value={badgeForm.textColor} onChange={(e) => setBadgeForm({ ...badgeForm, textColor: e.target.value })} className="flex-1" />
            </div>
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Marketplace Tujuan * (pilih atau tulis sendiri)</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {MARKETPLACE_OPTIONS.map((mp) => {
                const checked = badgeForm.marketplaces.includes(mp.value);
                return (
                  <button
                    key={mp.value}
                    type="button"
                    onClick={() => toggleMarketplace(mp.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      checked
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-violet-400"
                    }`}
                  >
                    {mp.emoji} {mp.label}
                  </button>
                );
              })}
            </div>
            {/* Custom marketplace input */}
            <div className="mt-2 flex gap-2">
              <Input
                placeholder="...atau tulis marketplace lain (cth: jdid, elevenia)"
                value={customMarketplaceInput}
                onChange={(e) => setCustomMarketplaceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomMarketplace();
                  }
                }}
                className="flex-1"
              />
              <Button type="button" size="sm" variant="outline" onClick={addCustomMarketplace} disabled={!customMarketplaceInput.trim()}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Tambah
              </Button>
            </div>
            {/* Tampilkan custom marketplaces yang sudah ditambah */}
            {badgeForm.marketplaces.filter((m) => !MARKETPLACE_OPTIONS.find((o) => o.value === m)).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {badgeForm.marketplaces
                  .filter((m) => !MARKETPLACE_OPTIONS.find((o) => o.value === m))
                  .map((m) => (
                    <span key={m} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-[10px]">
                      🏷️ {m}
                      <button type="button" onClick={() => toggleMarketplace(m)} className="ml-1 hover:text-red-600">×</button>
                    </span>
                  ))}
              </div>
            )}
            {badgeForm.marketplaces.length === 0 && (
              <p className="text-[10px] text-red-500 mt-1">Pilih minimal 1 marketplace</p>
            )}
          </div>
          <div>
            <Label className="text-xs">Urutan</Label>
            <Input type="number" value={badgeForm.order} onChange={(e) => setBadgeForm({ ...badgeForm, order: e.target.value })} />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <Switch checked={badgeForm.isActive} onCheckedChange={(v) => setBadgeForm({ ...badgeForm, isActive: v })} />
            <Label className="text-xs">Aktif</Label>
          </div>
        </div>

        {/* Live Preview */}
        {badgeForm.label && (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50 dark:bg-zinc-950">
            <p className="text-[10px] text-zinc-500 mb-2">Preview (seperti yang muncul di bawah foto produk):</p>
            <div className="flex flex-wrap gap-1">
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold"
                style={{ backgroundColor: badgeForm.bgColor, color: badgeForm.textColor }}
              >
                {badgeForm.emoji && <span>{badgeForm.emoji}</span>}
                {badgeForm.label}
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={() => saveBadgeMutation.mutate()} disabled={saveBadgeMutation.isPending || !badgeForm.label || badgeForm.marketplaces.length === 0}>
            <Save className="w-3.5 h-3.5 mr-1" /> {editingBadgeId ? "Simpan" : "Tambah"}
          </Button>
          {editingBadgeId && (
            <Button size="sm" variant="outline" onClick={() => { setEditingBadgeId(null); setBadgeForm(EMPTY_BADGE); }}>Batal</Button>
          )}
        </div>
      </div>

      {/* List */}
      {badgesLoading ? (
        <p className="text-xs text-zinc-500">Memuat badges...</p>
      ) : badges.length === 0 ? (
        <div className="text-center py-8 text-sm text-zinc-500">
          <Plus className="w-8 h-8 mx-auto mb-2 opacity-40" />
          Belum ada badge. Tambahkan di atas.
        </div>
      ) : (
        <div className="space-y-2">
          {badges.map((b: any) => {
            const mpLabels = (b.marketplaces || "").split(",").map((m: string) => m.trim()).filter(Boolean);
            return (
              <div key={b.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 flex items-center gap-3">
                {/* Badge preview */}
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold flex-shrink-0"
                  style={{ backgroundColor: b.bgColor, color: b.textColor }}
                >
                  {b.emoji && <span>{b.emoji}</span>}
                  {b.label}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {!b.isActive && <Badge className="bg-zinc-200 text-zinc-600 text-[9px]">Nonaktif</Badge>}
                    {b.isActive && <Badge className="bg-emerald-100 text-emerald-700 text-[9px]">Aktif</Badge>}
                    <span className="text-[10px] text-zinc-500">Urutan: {b.order}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {mpLabels.map((mp: string) => {
                      const opt = MARKETPLACE_OPTIONS.find((m) => m.value === mp);
                      return (
                        <span key={mp} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                          {opt?.emoji || "📦"} {opt?.label || mp}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                    setEditingBadgeId(b.id);
                    setBadgeForm({
                      label: b.label || "",
                      emoji: b.emoji || "",
                      bgColor: b.bgColor || "#ef4444",
                      textColor: b.textColor || "#ffffff",
                      marketplaces: mpLabels,
                      order: String(b.order ?? 0),
                      isActive: b.isActive ?? true,
                    });
                  }}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setDeleteBadgeTarget(b)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete badge dialog */}
      <AlertDialog open={!!deleteBadgeTarget} onOpenChange={(o) => !o && setDeleteBadgeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus badge?</AlertDialogTitle>
            <AlertDialogDescription>
              Badge <strong>{deleteBadgeTarget?.label}</strong> akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteBadgeTarget && deleteBadgeMutation.mutate(deleteBadgeTarget.id)} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
