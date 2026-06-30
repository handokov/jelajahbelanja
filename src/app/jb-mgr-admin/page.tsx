"use client";

import * as React from "react";
import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Settings2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Pencil,
  Save,
  X,
  Link2,
  ExternalLink,
  CheckCircle2,
  ShoppingBag,
  Package,
  ImageIcon,
  DollarSign,
  Star,
  MapPin,
  Image as ImageLucide,
  Upload,
  Wand2,
  Loader2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type {
  CategoryDTO,
  CreateCategoryInput,
  AffiliateTagDTO,
  UpdateAffiliateTagInput,
  Marketplace,
} from "@/lib/types";
import { formatRupiah } from "@/lib/format";
import { VALID_MARKETPLACES, MARKETPLACE_META } from "@/lib/config";
import { detectMarketplaceFromUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ─── Shared constants ───

const EMPTY_FORM: CreateCategoryInput = {
  name: "",
  emoji: "",
  keywords: "",
  amazonNode: "",
  aliexpressCat: "",
  shopeeCat: "",
  tokopediaCat: "",
  lazadaCat: "",
  enabled: true,
};

const EMPTY_PRODUCT: ProductFormInput = {
  title: "",
  image: "",
  price: "",
  originalPrice: "",
  discountPercent: "",
  rating: "",
  reviewCount: "",
  soldCount: "",
  location: "",
  category: "",
  url: "",
  affiliateUrl: "",
  marketplace: "shopee",
  enabled: true,
  isViral: false,
};

interface ProductFormInput {
  title: string;
  image: string;
  price: string;
  originalPrice: string;
  discountPercent: string;
  rating: string;
  reviewCount: string;
  soldCount: string;
  location: string;
  category: string;
  url: string;
  affiliateUrl: string;
  marketplace: string;
  enabled: boolean;
  isViral: boolean;
}

// ─── Helper: format Rupiah (imported from lib/format) ───
// formatRp() diganti formatRupiah() dari @/lib/format

// ─── Marketplace options (from config) ───
const MARKETPLACE_OPTIONS = VALID_MARKETPLACES.map((m) => ({
  value: m,
  label: m.charAt(0).toUpperCase() + m.slice(1),
}));

const AFFILIATE_INFO: Array<{
  id: Marketplace;
  label: string;
  param: string;
  signupUrl: string;
  hint: string;
}> = [
  {
    id: "shopee",
    label: "Shopee Affiliate",
    param: "aff_atk",
    signupUrl: "https://affiliate.shopee.co.id",
    hint: "Daftar gratis di affiliate.shopee.co.id. Setelah approve, salin tracking ID Anda (mis. abcDE123).",
  },
  {
    id: "tokopedia",
    label: "Tokopedia Affiliate",
    param: "aff_code",
    signupUrl: "https://affiliate.tokopedia.com",
    hint: "Daftar di affiliate.tokopedia.com. Salin affiliate code Anda (mis. jelajahbelanja).",
  },
  {
    id: "lazada",
    label: "Lazada Affiliate",
    param: "aff_id",
    signupUrl: "https://www.lazada.co.id/wow/camp/pdhl/id/lazadaaffiliate/index",
    hint: "Daftar di lazada.co.id affiliate program. Salin Aff ID Anda (mis. 12345).",
  },
  {
    id: "aliexpress",
    label: "AliExpress Affiliate",
    param: "aff_fcid",
    signupUrl: "https://portals.aliexpress.com",
    hint: "Daftar di portals.aliexpress.com. Salin tracking ID Anda.",
  },
];

// ─── Main component ───

export default function AdminPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ─── Queries ───

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Gagal memuat kategori");
      const json = await res.json();
      return json.categories as CategoryDTO[];
    },
    staleTime: 60 * 60 * 1000,
  });

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

  // ─── Category state ───
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<CreateCategoryInput>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = React.useState<CategoryDTO | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = React.useState(false);

  // ─── Product state ───
  const [productForm, setProductForm] = React.useState<ProductFormInput>(EMPTY_PRODUCT);
  const [editingProductId, setEditingProductId] = React.useState<string | null>(null);
  const [deleteProductTarget, setDeleteProductTarget] = React.useState<any>(null);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [autoFillUrl, setAutoFillUrl] = React.useState("");
  const [autoFillLoading, setAutoFillLoading] = React.useState(false);

  // ─── Banner state ───
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

  const EMPTY_BANNER = { title: "", subtitle: "", image: "", linkUrl: "", linkLabel: "", bgColor: "#7c3aed", order: "0", isActive: true, startDate: "", endDate: "" };
  const [bannerForm, setBannerForm] = React.useState(EMPTY_BANNER);
  const [editingBannerId, setEditingBannerId] = React.useState<string | null>(null);
  const [deleteBannerTarget, setDeleteBannerTarget] = React.useState<any>(null);
  const [bannerUploading, setBannerUploading] = React.useState(false);

  // Upload gambar banner ke server (Vercel Blob), fallback ke base64
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
        setBannerForm((prev: typeof EMPTY_BANNER) => ({ ...prev, image: url }));
        toast({ title: "Gambar berhasil diupload!" });
      } else {
        // Fallback: konversi ke base64
        console.warn("[Banner upload] API upload gagal, fallback ke base64");
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const img = document.createElement("img");
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const maxW = 1200;
              const maxH = 400;
              let w = img.width;
              let h = img.height;
              if (w > maxW) { h = h * maxW / w; w = maxW; }
              if (h > maxH) { w = w * maxH / h; h = maxH; }
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext("2d");
              ctx?.drawImage(img, 0, 0, w, h);
              resolve(canvas.toDataURL("image/jpeg", 0.85));
            };
            img.src = reader.result as string;
          };
          reader.readAsDataURL(file);
        });
        setBannerForm((prev: typeof EMPTY_BANNER) => ({ ...prev, image: dataUrl }));
        toast({ title: "Gambar berhasil dimuat (mode lokal)" });
      }
    } catch (err) {
      console.error("[Banner upload] Error:", err);
      toast({ title: "Gagal mengupload gambar", variant: "destructive" });
    } finally {
      setBannerUploading(false);
    }
  }, [toast]);

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

  // ─── Affiliate state ───
  const [affDrafts, setAffDrafts] = React.useState<Record<string, { tag: string; enabled: boolean }>>({});
  React.useEffect(() => {
    if (affiliateData) {
      const drafts: Record<string, { tag: string; enabled: boolean }> = {};
      for (const t of affiliateData) {
        drafts[t.marketplace] = { tag: t.tag, enabled: t.enabled };
      }
      setAffDrafts(drafts);
    }
  }, [affiliateData]);

  const categories = categoriesData ?? [];

  // ─── Category mutations ───

  const createMutation = useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Gagal membuat kategori"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Kategori dibuat", description: "Kategori baru berhasil ditambahkan." });
      setForm(EMPTY_FORM);
    },
    onError: (err: Error) => { toast({ title: "Gagal", description: err.message, variant: "destructive" }); },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: Partial<CreateCategoryInput> & { id: string }) => {
      const res = await fetch("/api/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Gagal memperbarui kategori"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Kategori diperbarui" });
      setEditingId(null); setForm(EMPTY_FORM);
    },
    onError: (err: Error) => { toast({ title: "Gagal", description: err.message, variant: "destructive" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Gagal menghapus kategori"); }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Kategori dihapus" }); setDeleteTarget(null);
    },
    onError: (err: Error) => { toast({ title: "Gagal", description: err.message, variant: "destructive" }); },
  });

  const reorderMutation = useMutation({
    mutationFn: async (cats: CategoryDTO[]) => {
      const payload = cats.map((c, i) => ({ id: c.id, order: i }));
      const res = await fetch("/api/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: payload }),
      });
      if (!res.ok) throw new Error("Gagal mengurutkan kategori");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/categories", { method: "PUT" });
      if (!res.ok) throw new Error("Gagal reset kategori");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Kategori direset ke default" }); setResetConfirmOpen(false);
    },
    onError: (err: Error) => { toast({ title: "Gagal", description: err.message, variant: "destructive" }); },
  });

  // ─── Product mutations ───

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
      setAutoFillUrl("");
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
      setEditingProductId(null); setProductForm(EMPTY_PRODUCT); setAutoFillUrl("");
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

  // ─── Affiliate mutations ───

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

  // ─── Category handlers ───

  function handleEditCat(c: CategoryDTO) {
    setEditingId(c.id);
    setForm({
      name: c.name, emoji: c.emoji, keywords: c.keywords,
      amazonNode: c.amazonNode ?? "", aliexpressCat: c.aliexpressCat ?? "",
      shopeeCat: c.shopeeCat ?? "", tokopediaCat: c.tokopediaCat ?? "",
      lazadaCat: c.lazadaCat ?? "", enabled: c.enabled,
    });
  }

  function handleSubmitCat() {
    if (!form.name.trim() || !form.emoji.trim() || !form.keywords.trim()) {
      toast({ title: "Validasi gagal", description: "Nama, emoji, dan keywords wajib diisi.", variant: "destructive" });
      return;
    }
    if (editingId) { updateMutation.mutate({ id: editingId, ...form }); }
    else { createMutation.mutate(form); }
  }

  function handleMoveCat(index: number, direction: "up" | "down") {
    if (!categoriesData) return;
    const next = [...categoriesData];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorderMutation.mutate(next);
  }

  function handleToggleEnabled(c: CategoryDTO, enabled: boolean) {
    updateMutation.mutate({ id: c.id, enabled });
  }

  // ─── Product handlers ───

  async function handleAutoFill() {
    const url = autoFillUrl.trim();
    if (!url) {
      toast({ title: "URL kosong", description: "Paste link produk Shopee dulu.", variant: "destructive" });
      return;
    }
    if (!url.includes("shopee") && !url.includes("shope")) {
      toast({ title: "URL tidak valid", description: "Masukkan link produk Shopee yang valid.", variant: "destructive" });
      return;
    }

    setAutoFillLoading(true);
    try {
      const res = await fetch("/api/scrape-shopee", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_SECRET || "jelajahbelanja2024"}`,
        },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast({
          title: "Gagal ambil data",
          description: data.error || "Tidak bisa mengambil data produk. Coba link lain.",
          variant: "destructive",
        });
        return;
      }

      const p = data.product;
      setProductForm({
        ...productForm,
        title: p.title || productForm.title,
        image: p.image || productForm.image,
        price: p.price ? String(p.price) : productForm.price,
        originalPrice: p.originalPrice ? String(p.originalPrice) : productForm.originalPrice,
        discountPercent: p.discountPercent ? String(p.discountPercent) : productForm.discountPercent,
        rating: p.rating ? String(p.rating) : productForm.rating,
        reviewCount: p.reviewCount ? String(p.reviewCount) : productForm.reviewCount,
        soldCount: p.soldCount ? String(p.soldCount) : productForm.soldCount,
        location: p.location || productForm.location,
        category: p.category || productForm.category,
        url: url,
        marketplace: detectMarketplaceFromUrl(url),
      });

      // Auto-show advanced fields supaya user bisa review semua data
      if (p.rating || p.reviewCount || p.soldCount || p.location) {
        setShowAdvanced(true);
      }

      toast({
        title: "Data produk berhasil diambil! ✨",
        description: `${p.title?.substring(0, 50)}${(p.title?.length || 0) > 50 ? "..." : ""} — Rp${(p.price || 0).toLocaleString("id-ID")}`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Gagal menghubungi server. Coba lagi.",
        variant: "destructive",
      });
    } finally {
      setAutoFillLoading(false);
    }
  }

  function handleSubmitProduct() {
    if (!productForm.title.trim() || !productForm.price || !productForm.category) {
      toast({ title: "Validasi gagal", description: "Judul produk, harga, dan kategori wajib diisi.", variant: "destructive" });
      return;
    }
    // URL produk: pakai url field, kalau gak diisi pakai affiliateUrl, kalau affiliateUrl juga gak ada, generate dari title
    const productUrl = productForm.url.trim() || productForm.affiliateUrl.trim() || `https://shopee.co.id/search?keyword=${encodeURIComponent(productForm.title)}`;
    // Auto-calc discount kalau ada harga asli
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

  // ─── Affiliate handlers ───

  function handleSaveAffiliate(m: Marketplace) {
    const draft = affDrafts[m];
    if (!draft) return;
    updateAffiliateMutation.mutate({ marketplace: m, tag: draft.tag, enabled: draft.enabled });
  }

  // ─── Render ───

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="container mx-auto px-4 max-w-5xl py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </Link>
            <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-fuchsia-600" />
              <span className="font-bold text-lg">JelajahBelanja</span>
              <Badge className="bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 hover:bg-fuchsia-100 text-[10px]">
                Admin
              </Badge>
            </div>
          </div>
          <h1 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Panel Admin
          </h1>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 max-w-5xl py-6">
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full max-w-xl grid-cols-4 h-11">
            <TabsTrigger value="products" className="text-sm">
              <Package className="w-4 h-4 mr-1.5" />
              Produk
            </TabsTrigger>
            <TabsTrigger value="banners" className="text-sm">
              <ImageLucide className="w-4 h-4 mr-1.5" />
              Banner
            </TabsTrigger>
            <TabsTrigger value="categories" className="text-sm">
              <Settings2 className="w-4 h-4 mr-1.5" />
              Kategori
            </TabsTrigger>
            <TabsTrigger value="affiliate" className="text-sm">
              <Link2 className="w-4 h-4 mr-1.5" />
              Affiliate
            </TabsTrigger>
          </TabsList>

          {/* ===== TAB PRODUK ===== */}
          <TabsContent value="products" className="space-y-4">
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
                    {showAdvanced ? "Sembunyikan Detail" : "Lihat Semua Field"}
                  </Button>
                )}
              </div>

              {/* Auto-fill dari link Shopee */}
              <div className="rounded-xl border-2 border-dashed border-fuchsia-200 dark:border-fuchsia-800/40 bg-fuchsia-50/50 dark:bg-fuchsia-950/20 p-4 mb-4">
                <Label className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                  <Wand2 className="w-3.5 h-3.5 text-fuchsia-600" />
                  Auto-Fill dari Link Shopee
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Paste link produk Shopee di sini... (https://shopee.co.id/... atau https://shope.ee/...)"
                    value={autoFillUrl}
                    onChange={(e) => setAutoFillUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !autoFillLoading) handleAutoFill(); }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAutoFill}
                    disabled={autoFillLoading || !autoFillUrl.trim()}
                    className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white shrink-0"
                  >
                    {autoFillLoading ? (
                      <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Mengambil...</>
                    ) : (
                      <><Wand2 className="w-3.5 h-3.5 mr-1" /> Ambil Data</>
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1.5">
                  Otomatis isi judul, harga, gambar, rating, terjual, lokasi & kategori dari link Shopee
                </p>
              </div>

              {/* Wajib fields - selalu tampil */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <Label htmlFor="prod-title" className="text-xs font-semibold">Judul Produk *</Label>
                  <Input
                    id="prod-title"
                    placeholder="Nama produk..."
                    value={productForm.title}
                    onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <Label htmlFor="prod-url" className="text-xs font-semibold flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> URL Shopee *
                  </Label>
                  <Input
                    id="prod-url"
                    placeholder="https://shopee.co.id/..."
                    value={productForm.url}
                    onChange={(e) => setProductForm({ ...productForm, url: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <Label htmlFor="prod-image" className="text-xs font-semibold flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> URL Foto Produk
                  </Label>
                  <Input
                    id="prod-image"
                    placeholder="https://down-id.img.susercontent.com/file/..."
                    value={productForm.image}
                    onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="prod-price" className="text-xs font-semibold flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> Harga (Rp) *
                  </Label>
                  <Input
                    id="prod-price"
                    type="number"
                    placeholder="19500"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="prod-original" className="text-xs font-semibold">Harga Asli / Coret (Rp)</Label>
                  <Input
                    id="prod-original"
                    type="number"
                    placeholder="99000"
                    value={productForm.originalPrice}
                    onChange={(e) => setProductForm({ ...productForm, originalPrice: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="prod-category" className="text-xs font-semibold">Kategori *</Label>
                  <select
                    id="prod-category"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Pilih kategori...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.emoji} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <Label htmlFor="prod-affiliate" className="text-xs font-semibold flex items-center gap-1">
                    <Link2 className="w-3 h-3" /> Link Affiliate Shopee (opsional)
                  </Label>
                  <Input
                    id="prod-affiliate"
                    placeholder="https://shope.ee/abcde"
                    value={productForm.affiliateUrl}
                    onChange={(e) => setProductForm({ ...productForm, affiliateUrl: e.target.value })}
                  />
                  <p className="text-[10px] text-zinc-400">
                    ini kalau udah punya link affiliate, Shortlink /beli/xxx otomatis redirect ke sini
                  </p>
                </div>
              </div>

              {/* Advanced fields - collapsible */}
              {showAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="prod-rating" className="text-xs flex items-center gap-1">
                      <Star className="w-3 h-3" /> Rating
                    </Label>
                    <Input
                      id="prod-rating"
                      type="number"
                      step="0.1"
                      placeholder="4.8"
                      value={productForm.rating}
                      onChange={(e) => setProductForm({ ...productForm, rating: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="prod-reviews" className="text-xs">Jumlah Review</Label>
                    <Input
                      id="prod-reviews"
                      type="number"
                      placeholder="1500"
                      value={productForm.reviewCount}
                      onChange={(e) => setProductForm({ ...productForm, reviewCount: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="prod-sold" className="text-xs">Jumlah Terjual</Label>
                    <Input
                      id="prod-sold"
                      type="number"
                      placeholder="5000"
                      value={productForm.soldCount}
                      onChange={(e) => setProductForm({ ...productForm, soldCount: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="prod-location" className="text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Lokasi
                    </Label>
                    <Input
                      id="prod-location"
                      placeholder="Jakarta Barat"
                      value={productForm.location}
                      onChange={(e) => setProductForm({ ...productForm, location: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="prod-marketplace" className="text-xs">Marketplace</Label>
                    <select
                      id="prod-marketplace"
                      value={productForm.marketplace}
                      onChange={(e) => setProductForm({ ...productForm, marketplace: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {MARKETPLACE_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="prod-disc" className="text-xs">Diskon (%)</Label>
                    <Input
                      id="prod-disc"
                      type="number"
                      placeholder="Auto dari harga coret"
                      value={productForm.discountPercent}
                      onChange={(e) => setProductForm({ ...productForm, discountPercent: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-4 gap-2">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <Switch
                      checked={productForm.enabled}
                      onCheckedChange={(checked) => setProductForm({ ...productForm, enabled: checked })}
                    />
                    Aktif
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <Switch
                      checked={productForm.isViral}
                      onCheckedChange={(checked) => setProductForm({ ...productForm, isViral: checked })}
                    />
                    DO Viral 🔥
                  </label>
                </div>
                <div className="flex gap-2">
                  {(editingProductId || productForm.title) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setEditingProductId(null); setProductForm(EMPTY_PRODUCT); setAutoFillUrl(""); }}
                    >
                      <X className="w-3.5 h-3.5 mr-1" /> Batal
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleSubmitProduct}
                    disabled={createProductMutation.isPending || updateProductMutation.isPending}
                  >
                    {editingProductId ? (
                      <><Save className="w-3.5 h-3.5 mr-1" /> Simpan</>
                    ) : (
                      <><Plus className="w-3.5 h-3.5 mr-1" /> Upload Produk</>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Daftar produk */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:p-6">
              <h2 className="font-semibold text-sm flex items-center gap-2 mb-4">
                <Package className="w-4 h-4" />
                Produk Manual ({productsData?.length ?? 0})
              </h2>
              {productsLoading ? (
                <div className="text-center py-8 text-sm text-zinc-500">Memuat...</div>
              ) : !productsData || productsData.length === 0 ? (
                <div className="text-center py-8 text-sm text-zinc-500">
                  Belum ada produk. Upload produk pertama lo di atas!
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {productsData.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-start gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50"
                    >
                      <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-700">
                        <img src={p.image} alt={p.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.png"; }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm line-clamp-1">{p.title}</span>
                          <Badge className={cn(
                            (MARKETPLACE_META as Record<string, { className: string }>)[p.marketplace || "shopee"]?.className
                              ?? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
                            "text-[10px] px-1.5 py-0 h-4"
                          )}>
                            {p.marketplace || "shopee"}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">{p.category}</Badge>
                          {!p.enabled && (
                            <Badge className="bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400 text-[10px]">Nonaktif</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatRupiah(p.price)}</span>
                          {p.originalPrice && p.originalPrice > p.price && (
                            <span className="line-through">{formatRupiah(p.originalPrice)}</span>
                          )}
                          {p.discountPercent && <span className="text-red-500">-{p.discountPercent}%</span>}
                          <span>· ★ {p.rating?.toFixed(1)}</span>
                          <span>· {p.soldCount?.toLocaleString()} terjual</span>
                        </div>
                        {p.affiliateUrl && (
                          <p className="text-[10px] text-fuchsia-600 dark:text-fuchsia-400 mt-0.5 truncate">
                            Affiliate: {p.affiliateUrl}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 pt-1">
                        <Switch
                          checked={p.enabled ?? true}
                          onCheckedChange={(checked) => updateProductMutation.mutate({ id: p.id, enabled: checked })}
                          aria-label="Toggle aktif"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEditProduct(p)}
                          aria-label="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-600 hover:text-red-700"
                          onClick={() => setDeleteProductTarget(p)}
                          aria-label="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>

          {/* ===== TAB BANNER ===== */}
          <TabsContent value="banners" className="space-y-4">
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
            ) : (bannersData ?? []).length === 0 ? (
              <div className="text-center py-8 text-sm text-zinc-500">
                <ImageLucide className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Belum ada banner. Tambahkan di atas.
              </div>
            ) : (
              <div className="space-y-3">
                {(bannersData ?? []).map((b: any) => (
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
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                {editingId ? <Pencil className="w-4 h-4 text-fuchsia-600" /> : <Plus className="w-4 h-4 text-fuchsia-600" />}
                <h2 className="font-semibold text-sm">{editingId ? "Edit Kategori" : "Tambah Kategori Baru"}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cat-emoji" className="text-xs">Emoji</Label>
                  <Input id="cat-emoji" placeholder="🔌" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className="w-20 text-center text-xl" maxLength={2} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cat-name" className="text-xs">Nama Kategori</Label>
                  <Input id="cat-name" placeholder="Elektronik" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <Label htmlFor="cat-keywords" className="text-xs">Keywords (pisahkan dengan koma)</Label>
                  <Input id="cat-keywords" placeholder="elektronik,gadget,smartphone" value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cat-shopee" className="text-xs">Shopee Category</Label>
                  <Input id="cat-shopee" placeholder="elektronik" value={form.shopeeCat ?? ""} onChange={(e) => setForm({ ...form, shopeeCat: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cat-tokopedia" className="text-xs">Tokopedia Category</Label>
                  <Input id="cat-tokopedia" placeholder="elektronik" value={form.tokopediaCat ?? ""} onChange={(e) => setForm({ ...form, tokopediaCat: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cat-lazada" className="text-xs">Lazada Category</Label>
                  <Input id="cat-lazada" placeholder="elektronik" value={form.lazadaCat ?? ""} onChange={(e) => setForm({ ...form, lazadaCat: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cat-amazon" className="text-xs">Amazon Node (opsional)</Label>
                  <Input id="cat-amazon" placeholder="172282" value={form.amazonNode ?? ""} onChange={(e) => setForm({ ...form, amazonNode: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 gap-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Switch checked={form.enabled} onCheckedChange={(checked) => setForm({ ...form, enabled: checked })} />
                  Aktif
                </label>
                <div className="flex gap-2">
                  {(editingId || form.name) && (
                    <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }}>
                      <X className="w-3.5 h-3.5 mr-1" /> Batal
                    </Button>
                  )}
                  <Button size="sm" onClick={handleSubmitCat} disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingId ? <><Save className="w-3.5 h-3.5 mr-1" /> Simpan</> : <><Plus className="w-3.5 h-3.5 mr-1" /> Tambah</>}
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-sm flex items-center gap-2"><Settings2 className="w-4 h-4" /> Daftar Kategori ({categories.length})</h2>
                <Button variant="outline" size="sm" onClick={() => setResetConfirmOpen(true)} disabled={resetMutation.isPending}>
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset Default
                </Button>
              </div>
              {categoriesLoading ? (
                <div className="text-center py-8 text-sm text-zinc-500">Memuat...</div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {categories.map((c, i) => (
                    <li key={c.id} className="flex items-start gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                      <div className="flex flex-col gap-0.5 pt-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveCat(i, "up")} disabled={i === 0}><ArrowUp className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveCat(i, "down")} disabled={i === categories.length - 1}><ArrowDown className="w-3.5 h-3.5" /></Button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xl">{c.emoji}</span>
                          <span className="font-semibold text-sm">{c.name}</span>
                          <Badge variant="outline" className="text-[10px]">#{c.order}</Badge>
                          {!c.enabled && <Badge className="bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400 text-[10px]">Nonaktif</Badge>}
                          {c.shopeeCat && <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 text-[10px] px-1.5 py-0 h-4">Shopee</Badge>}
                          {c.tokopediaCat && <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-[10px] px-1.5 py-0 h-4">Tokopedia</Badge>}
                          {c.lazadaCat && <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] px-1.5 py-0 h-4">Lazada</Badge>}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">Keywords: {c.keywords}</p>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Switch checked={c.enabled} onCheckedChange={(checked) => handleToggleEnabled(c, checked)} />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditCat(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={() => setDeleteTarget(c)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>

          {/* ===== TAB AFFILIATE ===== */}
          <TabsContent value="affiliate" className="space-y-4">
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
          </TabsContent>
        </Tabs>
      </main>

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

      {/* Delete category dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus kategori?</AlertDialogTitle>
            <AlertDialogDescription>
              Kategori <strong>{deleteTarget?.emoji} {deleteTarget?.name}</strong> akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Reset categories dialog */}
      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset semua kategori?</AlertDialogTitle>
            <AlertDialogDescription>Semua kategori akan dihapus dan diganti dengan 8 kategori default. Perubahan kustom Anda akan hilang.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => resetMutation.mutate()}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
