"use client";

import * as React from "react";
import {
  Plus,
  Trash2,
  Pin,
  PinOff,
  EyeOff,
  Eye,
  Flame,
  Loader2,
  ShoppingBag,
  LogOut,
  ExternalLink,
  Image as ImageIcon,
  Wand2,
  Link2,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ADMIN_SECRET_DEFAULT = "jelajahbelanja2024";
const CATEGORIES = ["Fashion", "Beauty", "Elektronik", "Home", "Gaming", "Olahraga", "Mainan", "Otomotif"];

interface ShopeeProduct {
  id: string;
  title: string;
  url: string;
  image: string;
  price: number;
  originalPrice: number | null;
  discountPercent: number | null;
  rating: number;
  reviewCount: number;
  soldCount: number;
  location: string | null;
  category: string;
  isViral: boolean;
  isPinned: boolean;
  isHidden: boolean;
  affiliateUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPage() {
  const [secret, setSecret] = React.useState("");
  const [authenticated, setAuthenticated] = React.useState(false);
  const [products, setProducts] = React.useState<ShopeeProduct[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);

  // Form state
  const [formTitle, setFormTitle] = React.useState("");
  const [formUrl, setFormUrl] = React.useState("");
  const [formImage, setFormImage] = React.useState("");
  const [formPrice, setFormPrice] = React.useState("");
  const [formOriginalPrice, setFormOriginalPrice] = React.useState("");
  const [formRating, setFormRating] = React.useState("4.8");
  const [formReviewCount, setFormReviewCount] = React.useState("");
  const [formSoldCount, setFormSoldCount] = React.useState("");
  const [formLocation, setFormLocation] = React.useState("");
  const [formCategory, setFormCategory] = React.useState("Fashion");
  const [formIsViral, setFormIsViral] = React.useState(false);
  const [formAffiliateUrl, setFormAffiliateUrl] = React.useState("");
  const [formNotes, setFormNotes] = React.useState("");
  const [formSubmitting, setFormSubmitting] = React.useState(false);

  // Auto-fill state
  const [scraping, setScraping] = React.useState(false);
  const [scrapeError, setScrapeError] = React.useState("");
  const [scrapeSuccess, setScrapeSuccess] = React.useState(false);

  const authHeaders = React.useMemo(
    () => ({ Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }),
    [secret]
  );

  function handleLogin() {
    if (secret.trim()) setAuthenticated(true);
  }

  const [apiError, setApiError] = React.useState("");

  async function fetchProducts() {
    setLoading(true);
    setApiError("");
    try {
      const res = await fetch("/api/admin/products", { headers: authHeaders });
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setApiError(data.error || "Gagal memuat produk");
        setProducts([]);
        return;
      }
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      setApiError("Tidak bisa terhubung ke server");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (authenticated) fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  /**
   * Auto-fill product details from Shopee URL
   */
  async function handleAutoFill() {
    if (!formUrl.trim()) {
      setScrapeError("Masukkan URL Shopee dulu");
      return;
    }

    if (!formUrl.includes("shopee")) {
      setScrapeError("URL harus dari Shopee (shopee.co.id atau shope.ee)");
      return;
    }

    setScraping(true);
    setScrapeError("");
    setScrapeSuccess(false);

    try {
      const res = await fetch("/api/scrape-shopee", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ url: formUrl.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setScrapeError(data.error || "Gagal mengambil data produk");
        return;
      }

      const p = data.product;
      if (p.title) setFormTitle(p.title);
      if (p.image) setFormImage(p.image);
      if (p.price) setFormPrice(String(p.price));
      if (p.originalPrice) setFormOriginalPrice(String(p.originalPrice));
      if (p.discountPercent) {
        // discount is auto-calculated on save, but show it
      }
      if (p.rating) setFormRating(String(p.rating));
      if (p.reviewCount) setFormReviewCount(String(p.reviewCount));
      if (p.soldCount) setFormSoldCount(String(p.soldCount));
      if (p.location) setFormLocation(p.location);
      if (p.category && CATEGORIES.includes(p.category)) setFormCategory(p.category);

      setScrapeSuccess(true);
      setTimeout(() => setScrapeSuccess(false), 3000);
    } catch {
      setScrapeError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setScraping(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          title: formTitle,
          url: formUrl,
          image: formImage,
          price: Number(formPrice),
          originalPrice: formOriginalPrice ? Number(formOriginalPrice) : null,
          rating: parseFloat(formRating) || 4.5,
          reviewCount: Number(formReviewCount) || 0,
          soldCount: Number(formSoldCount) || 0,
          location: formLocation || null,
          category: formCategory,
          isViral: formIsViral,
          affiliateUrl: formAffiliateUrl || null,
          notes: formNotes || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      resetForm();
      await fetchProducts();
    } catch {
      alert("Gagal menambah produk");
    } finally {
      setFormSubmitting(false);
    }
  }

  function resetForm() {
    setFormTitle(""); setFormUrl(""); setFormImage(""); setFormPrice("");
    setFormOriginalPrice(""); setFormRating("4.8"); setFormReviewCount("");
    setFormSoldCount(""); setFormLocation(""); setFormCategory("Fashion");
    setFormIsViral(false); setFormAffiliateUrl(""); setFormNotes(""); setShowForm(false);
    setScrapeError(""); setScrapeSuccess(false);
  }

  async function togglePin(id: string, current: boolean) {
    await fetch("/api/admin/products", {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ id, isPinned: !current }),
    });
    fetchProducts();
  }

  async function toggleHide(id: string, current: boolean) {
    await fetch("/api/admin/products", {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ id, isHidden: !current }),
    });
    fetchProducts();
  }

  async function toggleViral(id: string, current: boolean) {
    await fetch("/api/admin/products", {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ id, isViral: !current }),
    });
    fetchProducts();
  }

  async function deleteProduct(id: string) {
    if (!confirm("Yakin hapus produk ini?")) return;
    await fetch("/api/admin/products", {
      method: "DELETE",
      headers: authHeaders,
      body: JSON.stringify({ id }),
    });
    fetchProducts();
  }

  function formatRp(n: number) {
    return "Rp " + n.toLocaleString("id-ID");
  }

  function copyShortlink(id: string) {
    const shortlink = `${window.location.origin}/beli/${id}`;
    navigator.clipboard.writeText(shortlink);
  }

  // ====== LOGIN SCREEN ======
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-zinc-950 dark:to-zinc-900 p-4">
        <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">JB Admin</h1>
              <p className="text-xs text-zinc-500">Kelola produk Shopee</p>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 block">
                Password Admin
              </label>
              <Input
                type="password"
                placeholder="Masukkan password..."
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="h-11"
              />
              <p className="text-[11px] text-zinc-400 mt-1">
                Default: {ADMIN_SECRET_DEFAULT}
              </p>
            </div>
            <Button type="submit" className="w-full h-11 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-semibold">
              Masuk
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ====== MAIN ADMIN SCREEN ======
  const pinned = products.filter((p) => p.isPinned && !p.isHidden);
  const regular = products.filter((p) => !p.isPinned && !p.isHidden);
  const hidden = products.filter((p) => p.isHidden);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-zinc-950 dark:to-zinc-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="container mx-auto px-4 max-w-5xl flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <h1 className="text-base font-bold">JB Admin</h1>
            <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 text-[10px]">
              {products.length} produk
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setShowForm(!showForm)}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              Tambah
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAuthenticated(false)}
              className="text-zinc-500"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-5xl py-6 space-y-6">
        {/* API Error */}
        {apiError && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 p-3 text-sm text-red-700 dark:text-red-300">
            {apiError}
          </div>
        )}

        {/* Add Product Form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 shadow-lg"
          >
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4 text-fuchsia-600" />
              Tambah Produk Shopee
            </h2>

            {/* ====== STEP 1: Paste URL + Auto-fill ====== */}
            <div className="rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200/60 dark:border-violet-800/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-300">
                <Link2 className="w-4 h-4" />
                Langkah 1: Paste Link Shopee
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="https://shopee.co.id/... atau https://shope.ee/..."
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleAutoFill}
                  disabled={scraping || !formUrl.trim()}
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shrink-0"
                >
                  {scraping ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      Mengambil...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-1.5" />
                      Auto Fill
                    </>
                  )}
                </Button>
              </div>
              {scrapeError && (
                <p className="text-xs text-red-600 dark:text-red-400">{scrapeError}</p>
              )}
              {scrapeSuccess && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Data produk berhasil diisi otomatis! Cek & sesuaikan kalau perlu.
                </p>
              )}
              <p className="text-[11px] text-violet-500 dark:text-violet-400">
                Klik &quot;Auto Fill&quot; setelah paste link — judul, foto, harga, dll otomatis terisi.
              </p>
            </div>

            {/* ====== STEP 2: Product Details ====== */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Langkah 2: Detail Produk
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">Judul Produk *</label>
                  <Input placeholder="Earbuds TWS Pro Noise Cancelling..." value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">URL Foto *</label>
                  <Input placeholder="https://..." value={formImage} onChange={(e) => setFormImage(e.target.value)} required />
                  {formImage && (
                    <div className="mt-1.5 w-16 h-16 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                      <img src={formImage} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">Harga (Rp) *</label>
                  <Input type="number" placeholder="89000" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} required />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">Harga Asli (Rp)</label>
                  <Input type="number" placeholder="250000" value={formOriginalPrice} onChange={(e) => setFormOriginalPrice(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">Rating</label>
                  <Input type="number" step="0.1" min="0" max="5" value={formRating} onChange={(e) => setFormRating(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">Jumlah Review</label>
                  <Input type="number" placeholder="28500" value={formReviewCount} onChange={(e) => setFormReviewCount(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">Jumlah Terjual</label>
                  <Input type="number" placeholder="75000" value={formSoldCount} onChange={(e) => setFormSoldCount(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">Lokasi</label>
                  <Input placeholder="Jakarta Barat" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">Kategori</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full h-10 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsViral}
                      onChange={(e) => setFormIsViral(e.target.checked)}
                      className="w-4 h-4 rounded accent-fuchsia-600"
                    />
                    <Flame className="w-4 h-4 text-orange-500" />
                    Viral
                  </label>
                </div>
              </div>
            </div>

            {/* ====== STEP 3: Affiliate Link ====== */}
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/30 p-4 space-y-3">
              <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Langkah 3: Link Affiliate (Opsional)
              </div>
              <div>
                <Input
                  placeholder="https://shope.ee/abcde — diisi setelah akun affiliate approved"
                  value={formAffiliateUrl}
                  onChange={(e) => setFormAffiliateUrl(e.target.value)}
                />
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                  Kosongkan dulu kalau belum punya. Nanti bisa update di daftar produk — tanpa ubah kode atau redeploy!
                </p>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">Catatan</label>
              <Input placeholder="Info tambahan..." value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                type="submit"
                disabled={formSubmitting}
                className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white"
              >
                {formSubmitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                Simpan
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Batal
              </Button>
            </div>
          </form>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        )}

        {/* Product List */}
        {!loading && products.length === 0 && (
          <div className="text-center py-16">
            <ImageIcon className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
            <p className="text-zinc-500">Belum ada produk. Klik &quot;Tambah&quot; untuk mulai.</p>
          </div>
        )}

        {/* Pinned Section */}
        {pinned.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-1.5">
              <Pin className="w-3.5 h-3.5 text-violet-500" />
              Di-pin ({pinned.length})
            </h3>
            <div className="space-y-2">
              {pinned.map((p) => (
                <ProductRow key={p.id} p={p} onTogglePin={togglePin} onToggleHide={toggleHide} onToggleViral={toggleViral} onDelete={deleteProduct} formatRp={formatRp} onCopyShortlink={copyShortlink} />
              ))}
            </div>
          </section>
        )}

        {/* Regular Section */}
        {regular.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
              Produk Aktif ({regular.length})
            </h3>
            <div className="space-y-2">
              {regular.map((p) => (
                <ProductRow key={p.id} p={p} onTogglePin={togglePin} onToggleHide={toggleHide} onToggleViral={toggleViral} onDelete={deleteProduct} formatRp={formatRp} onCopyShortlink={copyShortlink} />
              ))}
            </div>
          </section>
        )}

        {/* Hidden Section */}
        {hidden.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-zinc-400 dark:text-zinc-500 mb-3 flex items-center gap-1.5">
              <EyeOff className="w-3.5 h-3.5" />
              Disembunyikan ({hidden.length})
            </h3>
            <div className="space-y-2 opacity-60">
              {hidden.map((p) => (
                <ProductRow key={p.id} p={p} onTogglePin={togglePin} onToggleHide={toggleHide} onToggleViral={toggleViral} onDelete={deleteProduct} formatRp={formatRp} onCopyShortlink={copyShortlink} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function ProductRow({
  p,
  onTogglePin,
  onToggleHide,
  onToggleViral,
  onDelete,
  formatRp,
  onCopyShortlink,
}: {
  p: ShopeeProduct;
  onTogglePin: (id: string, v: boolean) => void;
  onToggleHide: (id: string, v: boolean) => void;
  onToggleViral: (id: string, v: boolean) => void;
  onDelete: (id: string) => void;
  formatRp: (n: number) => string;
  onCopyShortlink: (id: string) => void;
}) {
  const [copied, setCopied] = React.useState(false);

  function handleCopy() {
    onCopyShortlink(`shopee-${p.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={cn(
      "flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 transition",
      p.isHidden && "opacity-50"
    )}>
      {/* Thumbnail */}
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex-shrink-0">
        <img src={p.image} alt={p.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' fill='%23ddd'%3E%3Crect width='56' height='56'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='12' fill='%23999'%3E?%3C/text%3E%3C/svg%3E"; }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate">{p.title}</p>
          {p.isViral && <Flame className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5 flex-wrap">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatRp(p.price)}</span>
          {p.originalPrice && p.originalPrice > p.price && (
            <>
              <span className="line-through">{formatRp(p.originalPrice)}</span>
              <Badge className="bg-red-100 text-red-700 text-[9px] px-1 py-0 h-4">-{p.discountPercent}%</Badge>
            </>
          )}
          <span>·</span>
          <Badge className="bg-orange-100 text-orange-700 text-[9px] px-1 py-0 h-4">Shopee</Badge>
          <span>·</span>
          <span>{p.category}</span>
          {p.affiliateUrl && (
            <>
              <span>·</span>
              <Badge className="bg-emerald-100 text-emerald-700 text-[9px] px-1 py-0 h-4">Affiliate</Badge>
            </>
          )}
        </div>
        {/* Shortlink display */}
        <div className="flex items-center gap-1 mt-1">
          <Link2 className="w-3 h-3 text-violet-500" />
          <span className="text-[10px] text-violet-600 dark:text-violet-400 font-mono">
            /beli/shopee-{p.id.slice(0, 8)}...
          </span>
        </div>
        {p.notes && (
          <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{p.notes}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", copied ? "text-emerald-500" : "text-violet-400 hover:text-violet-600")}
          onClick={handleCopy}
          title="Copy shortlink"
        >
          {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", p.isPinned ? "text-violet-600" : "text-zinc-400")}
          onClick={() => onTogglePin(p.id, p.isPinned)}
          title={p.isPinned ? "Unpin" : "Pin"}
        >
          {p.isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", p.isViral ? "text-orange-500" : "text-zinc-400")}
          onClick={() => onToggleViral(p.id, p.isViral)}
          title={p.isViral ? "Unmark viral" : "Mark viral"}
        >
          <Flame className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", p.isHidden ? "text-zinc-500" : "text-zinc-400")}
          onClick={() => onToggleHide(p.id, p.isHidden)}
          title={p.isHidden ? "Tampilkan" : "Sembunyikan"}
        >
          {p.isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </Button>
        <a
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="h-8 w-8 inline-flex items-center justify-center text-zinc-400 hover:text-blue-500"
          title="Buka di Shopee"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-400 hover:text-red-500"
          onClick={() => onDelete(p.id)}
          title="Hapus"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
