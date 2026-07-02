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
  X,
  Star,
  MapPin,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Pin,
  Package,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { CategoryDTO } from "@/lib/types";
import {
  EMPTY_PRODUCT,
  MARKETPLACE_OPTIONS,
  formatRp,
  type ProductFormInput,
} from "@/lib/admin-config";

export function ProductsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ─── State ───
  const [productForm, setProductForm] = React.useState<ProductFormInput>(EMPTY_PRODUCT);
  const [editingProductId, setEditingProductId] = React.useState<string | null>(null);
  const [deleteProductTarget, setDeleteProductTarget] = React.useState<any>(null);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  // ─── Queries ───
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Gagal memuat kategori");
      const json = await res.json();
      return json.categories as CategoryDTO[];
    },
    staleTime: 60 * 60 * 1000,
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const res = await fetch("/api/shopee-products");
      if (!res.ok) throw new Error("Gagal memuat produk");
      const json = await res.json();
      return json.products as any[];
    },
    staleTime: 30 * 1000,
  });

  // ─── Mutations ───
  const createProductMutation = useMutation({
    mutationFn: async (input: any) => {
      const res = await fetch("/api/shopee-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Gagal membuat produk"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Produk ditambahkan", description: "Produk baru berhasil diupload." });
      setProductForm(EMPTY_PRODUCT);
    },
    onError: (err: Error) => { toast({ title: "Gagal", description: err.message, variant: "destructive" }); },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (input: any) => {
      const res = await fetch("/api/shopee-products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Gagal memperbarui produk"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Produk diperbarui" });
      setEditingProductId(null); setProductForm(EMPTY_PRODUCT);
    },
    onError: (err: Error) => { toast({ title: "Gagal", description: err.message, variant: "destructive" }); },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/shopee-products?id=${id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Gagal menghapus produk"); }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Produk dihapus" }); setDeleteProductTarget(null);
    },
    onError: (err: Error) => { toast({ title: "Gagal", description: err.message, variant: "destructive" }); },
  });

  // ─── Handlers ───
  function handleSubmitProduct() {
    if (!productForm.title.trim() || !productForm.price || !productForm.category) {
      toast({ title: "Validasi gagal", description: "Judul produk, harga, dan kategori wajib diisi.", variant: "destructive" });
      return;
    }
    const productUrl = productForm.url.trim() || productForm.affiliateUrl.trim() || `https://shopee.co.id/search?keyword=${encodeURIComponent(productForm.title)}`;
    const price = Number(productForm.price);
    const originalPrice = productForm.originalPrice ? Number(productForm.originalPrice) : null;
    let discountPercent = productForm.discountPercent ? Number(productForm.discountPercent) : null;
    if (!discountPercent && originalPrice && originalPrice > price) {
      discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
    }
    const payload = {
      title: productForm.title,
      image: productForm.image.trim() || `https://down-id.img.susercontent.com/file/placeholder`,
      price,
      originalPrice,
      discountPercent,
      rating: productForm.rating !== "" ? Number(productForm.rating) : 4.8,
      reviewCount: productForm.reviewCount !== "" ? Number(productForm.reviewCount) : 1500,
      soldCount: productForm.soldCount !== "" ? Number(productForm.soldCount) : 5000,
      location: productForm.location || "Jakarta Barat",
      category: productForm.category,
      url: productUrl,
      affiliateUrl: productForm.affiliateUrl || null,
      marketplace: productForm.marketplace || "shopee",
      enabled: productForm.enabled,
      isViral: productForm.isViral,
    };
    if (editingProductId) {
      updateProductMutation.mutate({ id: editingProductId, ...payload });
    } else {
      createProductMutation.mutate(payload);
    }
  }

  function handleEditProduct(p: any) {
    setEditingProductId(p.id);
    setProductForm({
      title: p.title,
      image: p.image,
      price: String(p.price),
      originalPrice: p.originalPrice ? String(p.originalPrice) : "",
      discountPercent: p.discountPercent ? String(p.discountPercent) : "",
      rating: String(p.rating),
      reviewCount: String(p.reviewCount),
      soldCount: String(p.soldCount),
      location: p.location || "",
      category: p.category,
      url: p.url,
      affiliateUrl: p.affiliateUrl || "",
      marketplace: p.marketplace || "shopee",
      enabled: p.enabled ?? true,
      isViral: p.isViral ?? false,
    });
  }

  const products = productsData ?? [];
  const categories = categoriesData ?? [];

  return (
    <>
      {/* Cara pakai */}
      <div className="rounded-2xl border border-fuchsia-200 dark:border-fuchsia-900/50 bg-fuchsia-50 dark:bg-fuchsia-900/20 p-4">
        <p className="text-sm font-semibold text-fuchsia-900 dark:text-fuchsia-100 mb-2">
          Cara Tambah Produk dari Shopee
        </p>
        <ol className="text-xs text-fuchsia-900 dark:text-fuchsia-100 space-y-1 list-decimal list-inside">
          <li>Buka Shopee, cari produk viral yang mau lo promote</li>
          <li>Copy info: <strong>Nama produk, URL gambar, Harga</strong></li>
          <li>Generate <strong>link affiliate</strong> di dashboard Shopee Affiliate (affiliate.shopee.co.id)</li>
          <li>Paste semua di form di bawah, klik Upload</li>
        </ol>
        <p className="text-[11px] text-fuchsia-700 dark:text-fuchsia-300 mt-2">
          Field bertanda * wajib diisi. Sisanya udah auto-default (rating 4.9, terjual 5rb, dll). Bisa diedit nanti.
        </p>
      </div>

      {/* Quick-add form */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {editingProductId ? (
              <Pencil className="w-4 h-4 text-fuchsia-600" />
            ) : (
              <Plus className="w-4 h-4 text-fuchsia-600" />
            )}
            <h2 className="font-semibold text-sm">
              {editingProductId ? "Edit Produk" : "Quick Add Produk"}
            </h2>
          </div>
          {!editingProductId && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-zinc-500"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5 mr-1" /> : <ChevronDown className="w-3.5 h-3.5 mr-1" />}
              {showAdvanced ? "Sembunyikan" : "Lihat Semua Field"}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Judul */}
          <div className="md:col-span-2">
            <Label className="text-xs">Judul Produk *</Label>
            <Input placeholder="Contoh: Kemeja Flanel Premium Viral" value={productForm.title} onChange={(e) => setProductForm({ ...productForm, title: e.target.value })} />
          </div>

          {/* Gambar */}
          <div className="md:col-span-2">
            <Label className="text-xs flex items-center gap-1 mb-1">
              <Star className="w-3 h-3" /> URL Gambar Produk *
            </Label>
            <Input placeholder="https://down-id.img.susercontent.com/file/..." value={productForm.image} onChange={(e) => setProductForm({ ...productForm, image: e.target.value })} />
          </div>

          {/* Harga */}
          <div>
            <Label className="text-xs">Harga (Rp) *</Label>
            <Input type="number" placeholder="59000" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} />
          </div>

          {/* Harga Asli */}
          <div>
            <Label className="text-xs">Harga Asli (sebelum diskon)</Label>
            <Input type="number" placeholder="120000" value={productForm.originalPrice} onChange={(e) => setProductForm({ ...productForm, originalPrice: e.target.value })} />
          </div>

          {/* Kategori */}
          <div>
            <Label className="text-xs">Kategori *</Label>
            <select
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={productForm.category}
              onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
            >
              <option value="">— Pilih Kategori —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.emoji} {c.name}</option>
              ))}
            </select>
          </div>

          {/* Marketplace */}
          <div>
            <Label className="text-xs">Marketplace</Label>
            <select
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={productForm.marketplace}
              onChange={(e) => setProductForm({ ...productForm, marketplace: e.target.value })}
            >
              {MARKETPLACE_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* URL Produk */}
          <div className="md:col-span-2">
            <Label className="text-xs">URL Produk (link asli Shopee/Tokopedia)</Label>
            <Input placeholder="https://shopee.co.id/..." value={productForm.url} onChange={(e) => setProductForm({ ...productForm, url: e.target.value })} />
          </div>

          {/* Affiliate URL */}
          <div className="md:col-span-2">
            <Label className="text-xs flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Link Affiliate (shope.ee/xxx atau link tracking lain)
            </Label>
            <Input placeholder="https://shope.ee/xxx (dari dashboard affiliate)" value={productForm.affiliateUrl} onChange={(e) => setProductForm({ ...productForm, affiliateUrl: e.target.value })} />
          </div>

          {/* Advanced fields */}
          {showAdvanced && (
            <>
              <div>
                <Label className="text-xs">Diskon (%)</Label>
                <Input type="number" placeholder="50" value={productForm.discountPercent} onChange={(e) => setProductForm({ ...productForm, discountPercent: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1"><Star className="w-3 h-3" /> Rating</Label>
                <Input type="number" step="0.1" placeholder="4.8" value={productForm.rating} onChange={(e) => setProductForm({ ...productForm, rating: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Jumlah Review</Label>
                <Input type="number" placeholder="1500" value={productForm.reviewCount} onChange={(e) => setProductForm({ ...productForm, reviewCount: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Jumlah Terjual</Label>
                <Input type="number" placeholder="5000" value={productForm.soldCount} onChange={(e) => setProductForm({ ...productForm, soldCount: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1"><MapPin className="w-3 h-3" /> Lokasi</Label>
                <Input placeholder="Jakarta Barat" value={productForm.location} onChange={(e) => setProductForm({ ...productForm, location: e.target.value })} />
              </div>
              <div className="flex items-center gap-4 pt-5">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Switch checked={productForm.enabled} onCheckedChange={(checked) => setProductForm({ ...productForm, enabled: checked })} />
                  Tampilkan
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Switch checked={productForm.isViral} onCheckedChange={(checked) => setProductForm({ ...productForm, isViral: checked })} />
                  Viral
                </label>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 pt-3">
          <Button size="sm" onClick={handleSubmitProduct} disabled={createProductMutation.isPending || updateProductMutation.isPending}>
            <Save className="w-3.5 h-3.5 mr-1" />
            {editingProductId ? "Simpan Perubahan" : "Upload Produk"}
          </Button>
          {editingProductId && (
            <Button size="sm" variant="outline" onClick={() => { setEditingProductId(null); setProductForm(EMPTY_PRODUCT); }}>
              <X className="w-3.5 h-3.5 mr-1" /> Batal
            </Button>
          )}
        </div>
      </div>

      {/* Product list */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:p-6">
        <h2 className="font-semibold text-sm mb-4">
          Daftar Produk ({products.length})
        </h2>
        {productsLoading ? (
          <div className="text-center py-8 text-sm text-zinc-500">Memuat...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-sm text-zinc-500">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Belum ada produk. Tambahkan di atas.
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
            {products.map((p: any) => (
              <div
                key={p.id}
                className={`flex gap-3 p-3 rounded-xl border ${
                  p.isHidden ? "border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10" :
                  !p.enabled ? "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 opacity-60" :
                  "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                }`}
              >
                <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  {p.image && <img src={p.image} alt={p.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium truncate max-w-[200px]">{p.title}</span>
                    {p.isViral && <Badge className="bg-yellow-100 text-yellow-800 text-[9px] px-1 py-0 h-4">VIRAL</Badge>}
                    {p.isPinned && <Badge className="bg-fuchsia-100 text-fuchsia-800 text-[9px] px-1 py-0 h-4">PINNED</Badge>}
                    {!p.enabled && <Badge className="bg-zinc-200 text-zinc-600 text-[9px] px-1 py-0 h-4">OFF</Badge>}
                    {p.isHidden && <Badge className="bg-red-100 text-red-700 text-[9px] px-1 py-0 h-4">HIDDEN</Badge>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                    <span className="font-semibold text-fuchsia-600">{formatRp(p.price)}</span>
                    {p.originalPrice && <span className="line-through">{formatRp(p.originalPrice)}</span>}
                    <span>{p.category}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                    <span className="inline-flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" /> {p.rating?.toFixed(1)}</span>
                    <span>{p.soldCount?.toLocaleString("id-ID")} terjual</span>
                    {p.affiliateUrl && (
                      <span className="text-emerald-600">Affiliate: {p.affiliateUrl.length > 30 ? p.affiliateUrl.slice(0, 30) + "..." : p.affiliateUrl}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditProduct(p)}><Pencil className="w-3 h-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setDeleteProductTarget(p)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete product dialog */}
      <AlertDialog open={!!deleteProductTarget} onOpenChange={(o) => !o && setDeleteProductTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus produk?</AlertDialogTitle>
            <AlertDialogDescription>
              Produk <strong>{deleteProductTarget?.title}</strong> akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteProductTarget && deleteProductMutation.mutate(deleteProductTarget.id)} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
