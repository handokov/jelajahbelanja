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
  CheckboxCheck,
  Checkbox,
  Square,
  CheckSquare,
  FolderInput,
  AlertTriangle,
  Filter,
  Zap,
  RefreshCw,
  ImagePlus,
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

  // ─── Bulk Delete State ───
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = React.useState(false);
  const [showFilterDeleteDialog, setShowFilterDeleteDialog] = React.useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = React.useState(false);

  // ─── Refresh State ───
  const [refreshProgress, setRefreshProgress] = React.useState<{ total: number; done: number; ok: number } | null>(null);
  const [imgRefreshProgress, setImgRefreshProgress] = React.useState<{ total: number; done: number; ok: number; current: string } | null>(null);
  const [filterDeleteCategory, setFilterDeleteCategory] = React.useState("");
  const [filterDeleteMarketplace, setFilterDeleteMarketplace] = React.useState("");
  const [filterDeleteOlderDays, setFilterDeleteOlderDays] = React.useState("");
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");
  const [showBulkMoveCategory, setShowBulkMoveCategory] = React.useState(false);
  const [bulkMoveCategory, setBulkMoveCategory] = React.useState("");
  const [filterCategory, setFilterCategory] = React.useState("");
  const [filterMarketplace, setFilterMarketplace] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");

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

  // ─── Bulk Delete Mutation ───
  const bulkDeleteMutation = useMutation({
    mutationFn: async (payload: { ids?: string[]; category?: string; marketplace?: string; deleteAll?: boolean; olderThanDays?: number }) => {
      const res = await fetch("/api/bulk-delete-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Gagal menghapus produk"); }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setSelectedIds(new Set());
      setShowBulkDeleteDialog(false);
      setShowFilterDeleteDialog(false);
      setShowDeleteAllDialog(false);
      setDeleteConfirmText("");
      setFilterDeleteCategory("");
      setFilterDeleteMarketplace("");
      setFilterDeleteOlderDays("");
      toast({ title: "Produk dihapus", description: `${data.deleted} produk berhasil dihapus.` });
    },
    onError: (err: Error) => { toast({ title: "Gagal Hapus", description: err.message, variant: "destructive" }); },
  });

  // ─── Refresh Mutation (single product) ───
  const refreshProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch("/api/refresh-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Gagal refresh produk"); }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      const result = data.results?.[0];
      if (result?.status === "ok") {
        toast({ title: "Produk di-refresh", description: `Data produk berhasil diupdate dari Shopee (${result.reason})` });
      } else {
        toast({ title: "Refresh gagal", description: result?.reason || "Tidak bisa ambil data dari Shopee", variant: "destructive" });
      }
    },
    onError: (err: Error) => { toast({ title: "Gagal Refresh", description: err.message, variant: "destructive" }); },
  });

  // ─── Refresh Selected Products ───
  async function handleRefreshSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setRefreshProgress({ total: ids.length, done: 0, ok: 0 });
    let okCount = 0;

    for (let i = 0; i < ids.length; i++) {
      try {
        const res = await fetch("/api/refresh-products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: ids[i] }),
        });
        const data = await res.json();
        if (data.results?.[0]?.status === "ok") okCount++;
      } catch {}
      setRefreshProgress({ total: ids.length, done: i + 1, ok: okCount });
    }

    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    setSelectedIds(new Set());
    setRefreshProgress(null);
    toast({ title: "Refresh selesai", description: `${okCount} dari ${ids.length} produk berhasil di-update dari Shopee` });
  }

  // ─── Refresh All Products ───
  async function handleRefreshAll() {
    const allProducts = productsData ?? [];
    if (allProducts.length === 0) return;

    const ids = allProducts.map((p: any) => p.id);
    setRefreshProgress({ total: ids.length, done: 0, ok: 0 });
    let okCount = 0;

    // Process in batches of 5
    const BATCH = 5;
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(async (pid: string) => {
          const res = await fetch("/api/refresh-products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: pid }),
          });
          const data = await res.json();
          return data.results?.[0]?.status === "ok" ? 1 : 0;
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) okCount++;
      }
      setRefreshProgress({ total: ids.length, done: Math.min(i + BATCH, ids.length), ok: okCount });
    }

    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    setRefreshProgress(null);
    toast({ title: "Refresh semua selesai", description: `${okCount} dari ${ids.length} produk berhasil di-update dari Shopee` });
  }

  // ─── Refresh Image Tokopedia (browser-side fetch + Cloudinary upload) ───
  async function handleRefreshImages() {
    const allProducts = productsData ?? [];
    // Filter: Tokopedia products with expiring image URLs (not Cloudinary)
    const needRefresh = allProducts.filter((p: any) =>
      p.marketplace === "tokopedia" &&
      p.image &&
      !p.image.includes("cloudinary.com") &&
      (p.image.includes("tokopedia-static") || p.image.includes("p16-images") || p.image.includes("p19-images"))
    );

    if (needRefresh.length === 0) {
      toast({ title: "Tidak ada produk Tokopedia yang perlu refresh image" });
      return;
    }

    setImgRefreshProgress({ total: needRefresh.length, done: 0, ok: 0, current: "" });
    let okCount = 0;

    for (let i = 0; i < needRefresh.length; i++) {
      const product = needRefresh[i];
      const title = product.title?.slice(0, 30) || "Unknown";
      setImgRefreshProgress({ total: needRefresh.length, done: i, ok: okCount, current: title });

      try {
        // Step 1: Fetch Tokopedia product page (from browser — CAN access CDN)
        const pageRes = await fetch(product.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html",
          },
          signal: AbortSignal.timeout(10000),
        });

        if (!pageRes.ok) continue;

        // Read first 50KB (og:image is in <head>)
        const reader = pageRes.body?.getReader();
        let html = "";
        if (reader) {
          const decoder = new TextDecoder();
          while (html.length < 50000) {
            const { done, value } = await reader.read();
            if (done) break;
            html += decoder.decode(value, { stream: true });
          }
          reader.cancel();
        }

        // Step 2: Extract image URL
        let imageUrl: string | null = null;
        const ogMatch = html.match(/property=["']og:image["']\s+content=["']([^"']+)/i);
        if (ogMatch) imageUrl = ogMatch[1];
        if (!imageUrl) {
          const signMatch = html.match(/https:\/\/p16-images-sign-sg\.tokopedia-static\.net\/[^"'\s<>\\]+\.(?:jpg|jpeg|png|webp)/i);
          if (signMatch) imageUrl = signMatch[0];
        }
        if (!imageUrl) continue;

        // Step 3: Download image as blob
        const imgRes = await fetch(imageUrl, {
          headers: { "Referer": "https://www.tokopedia.com/", "Accept": "image/*" },
          signal: AbortSignal.timeout(8000),
        });
        if (!imgRes.ok) continue;

        const blob = await imgRes.blob();
        if (blob.size < 1000) continue;

        // Step 4: Convert to base64
        const base64: string = await new Promise((resolve) => {
          const r = new FileReader();
          r.onloadend = () => resolve(r.result as string);
          r.readAsDataURL(blob);
        });

        // Step 5: Upload to Cloudinary via API
        const uploadRes = await fetch("/api/mirror-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ image: base64, publicId: product.id }),
        });

        if (!uploadRes.ok) continue;
        const uploadData = await uploadRes.json();
        if (!uploadData.success || !uploadData.url) continue;

        // Step 6: Update product image in DB
        await fetch("/api/shopee-products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id: product.id, image: uploadData.url }),
        });

        okCount++;
      } catch {
        // skip this product, continue to next
      }

      setImgRefreshProgress({ total: needRefresh.length, done: i + 1, ok: okCount, current: "" });
      // Small delay to avoid overwhelming
      await new Promise(r => setTimeout(r, 300));
    }

    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    setImgRefreshProgress(null);
    toast({
      title: "Refresh Image Tokopedia selesai",
      description: `${okCount} dari ${needRefresh.length} produk image berhasil di-mirror ke Cloudinary`,
    });
  }

  // ─── Selection Handlers ───
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const products = productsData ?? [];
    if (selectedIds.size === products.length && products.length > 0) {
      // Deselect all
      setSelectedIds(new Set());
    } else {
      // Select all
      setSelectedIds(new Set(products.map((p: any) => p.id)));
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

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

  const allProducts = productsData ?? [];
  const categories = categoriesData ?? [];

  // Apply filters (category, marketplace, search)
  const products = allProducts.filter((p: any) => {
    if (filterCategory && p.category !== filterCategory) return false;
    if (filterMarketplace && p.marketplace?.toLowerCase() !== filterMarketplace.toLowerCase()) return false;
    if (searchQuery && !p.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Get unique categories from products for filter dropdown
  const uniqueCategories = Array.from(new Set(allProducts.map((p: any) => p.category).filter(Boolean))).sort();

  const allSelected = products.length > 0 && selectedIds.size === products.length;

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
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
          <span className="text-xs font-semibold text-zinc-500">FILTER:</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-8 rounded-md border border-input bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-2 text-xs"
          >
            <option value="">Semua Kategori ({allProducts.length})</option>
            {uniqueCategories.map((cat: string) => (
              <option key={cat} value={cat}>{cat} ({allProducts.filter((p: any) => p.category === cat).length})</option>
            ))}
          </select>
          <select
            value={filterMarketplace}
            onChange={(e) => setFilterMarketplace(e.target.value)}
            className="h-8 rounded-md border border-input bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-2 text-xs"
          >
            <option value="">Semua Marketplace</option>
            <option value="shopee">Shopee</option>
            <option value="tokopedia">Tokopedia</option>
            <option value="tiktok">TikTok</option>
            <option value="blibli">Blibli</option>
            <option value="lazada">Lazada</option>
          </select>
          <input
            type="text"
            placeholder="Cari judul produk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 rounded-md border border-input bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-2 text-xs flex-1 min-w-[150px]"
          />
          {(filterCategory || filterMarketplace || searchQuery) && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-zinc-500"
              onClick={() => { setFilterCategory(""); setFilterMarketplace(""); setSearchQuery(""); }}
            >
              ✕ Reset
            </Button>
          )}
          <span className="text-xs text-zinc-400 ml-auto">
            {products.length} dari {allProducts.length} produk
          </span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">
            Daftar Produk ({products.length})
          </h2>
          <div className="flex items-center gap-2">
            {/* Refresh All Button */}
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
              onClick={handleRefreshAll}
              disabled={refreshProgress !== null || imgRefreshProgress !== null}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshProgress ? "animate-spin" : ""}`} />
              {refreshProgress ? `Refresh ${refreshProgress.done}/${refreshProgress.total}` : "Refresh dari Shopee"}
            </Button>
            {/* Refresh Image Tokopedia — re-fetch expired image → Cloudinary */}
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-400 dark:hover:bg-violet-900/20"
              onClick={handleRefreshImages}
              disabled={imgRefreshProgress !== null || refreshProgress !== null}
            >
              <ImagePlus className={`w-3.5 h-3.5 mr-1 ${imgRefreshProgress ? "animate-spin" : ""}`} />
              {imgRefreshProgress
                ? `Image ${imgRefreshProgress.done}/${imgRefreshProgress.total} (${imgRefreshProgress.ok} ok)`
                : "🔄 Refresh Image Tokped"}
            </Button>
            {/* Filter Delete Button */}
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-900/20"
              onClick={() => setShowFilterDeleteDialog(true)}
            >
              <Filter className="w-3.5 h-3.5 mr-1" />
              Hapus by Filter
            </Button>
            {/* Delete All Button */}
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              onClick={() => setShowDeleteAllDialog(true)}
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
              Hapus Semua
            </Button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="mb-3 flex items-center gap-3 p-3 rounded-xl bg-fuchsia-50 dark:bg-fuchsia-900/20 border border-fuchsia-200 dark:border-fuchsia-800">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-fuchsia-600" />
              <span className="text-sm font-medium text-fuchsia-900 dark:text-fuchsia-100">
                {selectedIds.size} produk dipilih
              </span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={clearSelection}
              >
                Batal Pilih
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-400"
                onClick={() => setShowBulkMoveCategory(true)}
              >
                <FolderInput className="w-3.5 h-3.5 mr-1" />
                Pindah Kategori
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
                onClick={handleRefreshSelected}
                disabled={refreshProgress !== null}
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshProgress ? "animate-spin" : ""}`} />
                Refresh {selectedIds.size} Produk
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="text-xs"
                onClick={() => setShowBulkDeleteDialog(true)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Hapus {selectedIds.size} Produk
              </Button>
            </div>
          </div>
        )}

        {/* Select All checkbox */}
        {products.length > 0 && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-fuchsia-600 dark:hover:text-fuchsia-400 transition-colors"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-fuchsia-600" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {allSelected ? "Batal Pilih Semua" : "Pilih Semua"}
            </button>
          </div>
        )}

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
                  selectedIds.has(p.id)
                    ? "border-fuchsia-300 dark:border-fuchsia-700 bg-fuchsia-50/50 dark:bg-fuchsia-900/10"
                    : p.isHidden ? "border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10" :
                    !p.enabled ? "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 opacity-60" :
                    "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                }`}
              >
                {/* Checkbox */}
                <div className="flex items-center flex-shrink-0 pt-5">
                  <button
                    onClick={() => toggleSelect(p.id)}
                    className="text-zinc-400 hover:text-fuchsia-600 dark:hover:text-fuchsia-400 transition-colors"
                  >
                    {selectedIds.has(p.id) ? (
                      <CheckSquare className="w-4.5 h-4.5 text-fuchsia-600" />
                    ) : (
                      <Square className="w-4.5 h-4.5" />
                    )}
                  </button>
                </div>

                {/* Image */}
                <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  {p.image && <img src={p.image} alt={p.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                </div>

                {/* Info */}
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
                    <span className="text-zinc-400">•</span>
                    <span className="text-zinc-400 capitalize">{p.marketplace || "shopee"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                    <span className="inline-flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" /> {p.rating?.toFixed(1)}</span>
                    <span>{p.soldCount?.toLocaleString("id-ID")} terjual</span>
                    {p.affiliateUrl && (
                      <span className="text-emerald-600">Affiliate: {p.affiliateUrl.length > 30 ? p.affiliateUrl.slice(0, 30) + "..." : p.affiliateUrl}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditProduct(p)}><Pencil className="w-3 h-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-500" onClick={() => refreshProductMutation.mutate(p.id)} disabled={refreshProductMutation.isPending} title="Refresh dari Shopee"><RefreshCw className={`w-3 h-3 ${refreshProductMutation.isPending ? "animate-spin" : ""}`} /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setDeleteProductTarget(p)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Delete single product dialog ── */}
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

      {/* ── Bulk Delete dialog (selected products) ── */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Hapus {selectedIds.size} Produk?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{selectedIds.size} produk</strong> yang kamu pilih akan dihapus permanen.
              Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate({ ids: Array.from(selectedIds) })}
              className="bg-red-600 hover:bg-red-700"
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? "Menghapus..." : `Hapus ${selectedIds.size} Produk`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Filter Delete dialog ── */}
      <AlertDialog open={showFilterDeleteDialog} onOpenChange={(open) => { setShowFilterDeleteDialog(open); if (!open) { setDeleteConfirmText(""); } }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-orange-500" />
              Hapus Produk by Filter
            </AlertDialogTitle>
            <AlertDialogDescription>
              Pilih filter untuk menghapus produk secara massal. <strong>Wajib pilih minimal 1 filter</strong> (kategori/marketplace/umur).
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2">
            {/* Category filter */}
            <div>
              <Label className="text-xs font-medium">Kategori</Label>
              <select
                className="w-full h-9 mt-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={filterDeleteCategory}
                onChange={(e) => setFilterDeleteCategory(e.target.value)}
              >
                <option value="">— Semua Kategori —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.emoji} {c.name}</option>
                ))}
              </select>
            </div>

            {/* Marketplace filter */}
            <div>
              <Label className="text-xs font-medium">Marketplace</Label>
              <select
                className="w-full h-9 mt-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={filterDeleteMarketplace}
                onChange={(e) => setFilterDeleteMarketplace(e.target.value)}
              >
                <option value="">— Semua Marketplace —</option>
                {MARKETPLACE_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Age filter */}
            <div>
              <Label className="text-xs font-medium">Lebih lama dari (hari)</Label>
              <Input
                type="number"
                placeholder="Contoh: 30 (hapus produk > 30 hari)"
                value={filterDeleteOlderDays}
                onChange={(e) => setFilterDeleteOlderDays(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Live preview count */}
            <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 p-3 text-xs text-orange-800 dark:text-orange-200 border border-orange-200 dark:border-orange-800">
              {filterDeleteCategory || filterDeleteMarketplace || filterDeleteOlderDays ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-orange-600" />
                  Akan menghapus produk dengan filter:
                  <ul className="mt-1 ml-4 list-disc">
                    {filterDeleteCategory && <li>Kategori: <strong>{filterDeleteCategory}</strong></li>}
                    {filterDeleteMarketplace && <li>Marketplace: <strong>{filterDeleteMarketplace}</strong></li>}
                    {filterDeleteOlderDays && <li>Lebih lama dari: <strong>{filterDeleteOlderDays} hari</strong></li>}
                  </ul>
                  <p className="mt-2 text-orange-600 font-semibold">
                    ⚠️ Ketik nama kategori atau "HAPUS" untuk konfirmasi:
                  </p>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 inline mr-1" />
                  <strong>Wajib pilih minimal 1 filter!</strong> Tanpa filter, tombol hapus tidak akan aktif.
                </>
              )}
            </div>

            {/* Confirmation input — hanya muncul kalau ada filter */}
            {(filterDeleteCategory || filterDeleteMarketplace || filterDeleteOlderDays) && (
              <div>
                <Input
                  placeholder={filterDeleteCategory ? `Ketik: ${filterDeleteCategory}` : 'Ketik: HAPUS'}
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const payload: any = {};
                if (filterDeleteCategory) payload.category = filterDeleteCategory;
                if (filterDeleteMarketplace) payload.marketplace = filterDeleteMarketplace;
                if (filterDeleteOlderDays) payload.olderThanDays = Number(filterDeleteOlderDays);
                bulkDeleteMutation.mutate(payload);
              }}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={
                bulkDeleteMutation.isPending ||
                (!filterDeleteCategory && !filterDeleteMarketplace && !filterDeleteOlderDays) ||
                (filterDeleteCategory
                  ? deleteConfirmText !== filterDeleteCategory
                  : deleteConfirmText !== "HAPUS")
              }
            >
              {bulkDeleteMutation.isPending ? "Menghapus..." : `Hapus Produk${filterDeleteCategory ? ` (${filterDeleteCategory})` : ""}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete All dialog — DANGER ZONE ── */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={(open) => { setShowDeleteAllDialog(open); if (!open) setDeleteConfirmText(""); }}>
        <AlertDialogContent className="max-w-md border-2 border-red-500">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              🚫 DANGER: HAPUS SEMUA {products.length} PRODUK?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-red-600">PERINGATAN KERAS:</strong> Semua {products.length} produk akan dihapus <strong>PERMANEN</strong>.
              <br/><br/>
              <span className="text-red-500">⚠️ Tindakan ini TIDAK BISA dibatalkan!</span>
              <br/><br/>
              <span className="text-zinc-500 text-xs">💡 Tips: Kalau mau hide produk (bukan hapus), gunakan tombol "Hide" per produk atau bulk hide via API.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-2">
            <Label className="text-xs font-medium text-red-600">
              Ketik <strong>HAPUS SEMUA {products.length} PRODUK</strong> untuk konfirmasi:
            </Label>
            <Input
              placeholder={`HAPUS SEMUA ${products.length} PRODUK`}
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="mt-1 border-red-300 focus-visible:ring-red-500"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="border-green-300 text-green-700 hover:bg-green-50">Batal (Aman)</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate({ deleteAll: true })}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteConfirmText !== `HAPUS SEMUA ${products.length} PRODUK` || bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? "Menghapus..." : "🚫 HAPUS SEMUA PERMANEN"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Move Category Dialog */}
      <AlertDialog open={showBulkMoveCategory} onOpenChange={setShowBulkMoveCategory}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pindah {selectedIds.size} Produk ke Kategori?</AlertDialogTitle>
            <AlertDialogDescription>
              Pilih kategori tujuan. Semua produk yang dipilih akan dipindahkan ke kategori ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label className="text-xs mb-1 block">Kategori Tujuan</Label>
            <select
              value={bulkMoveCategory}
              onChange={(e) => setBulkMoveCategory(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3 py-1 text-sm shadow-sm"
            >
              <option value="">— Pilih Kategori —</option>
              {(categoriesData ?? []).map((c: any) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!bulkMoveCategory || selectedIds.size === 0) return;
                const ids = Array.from(selectedIds);
                let ok = 0;
                for (const id of ids) {
                  try {
                    const res = await fetch(`/api/shopee-products`, {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ id, category: bulkMoveCategory }),
                      credentials: "include",
                    });
                    if (res.ok) ok++;
                  } catch {}
                }
                toast({ title: `✅ ${ok} produk dipindahkan ke ${bulkMoveCategory}` });
                setShowBulkMoveCategory(false);
                setBulkMoveCategory("");
                clearSelection();
                queryClient.invalidateQueries({ queryKey: ["admin-products"] });
              }}
              disabled={!bulkMoveCategory}
              className="bg-violet-600 hover:bg-violet-700"
            >
              Pindah {selectedIds.size} Produk
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
