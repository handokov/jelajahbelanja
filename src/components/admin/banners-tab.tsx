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
    </>
  );
}
