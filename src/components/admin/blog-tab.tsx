"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  Sparkles,
  Wand2,
  FileText,
  CheckCircle,
  FileEdit,
  Search,
  X,
  Save,
  Loader2,
  AlertCircle,
  ImagePlus,
  Link as LinkIcon,
  Package,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───
interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  coverImage: string | null;
  excerpt: string;
  category: string;
  readTime: string;
  author: string;
  tags: string;
  metaDescription: string;
  content: string;
  isPublished: boolean;
  isAiGenerated: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface BlogStats {
  total: number;
  published: number;
  draft: number;
  ai: number;
  manual: number;
}

interface BlogListResponse {
  success: boolean;
  articles: BlogArticle[];
  total: number;
  stats: BlogStats;
  categories: string[];
}

interface TrendingSuggestion {
  title: string;
  category: string;
  prompt: string;
  reason: string;
  searchVolume: string; // "Tinggi" | "Sedang" | "Rendah"
  keyword: string;
}

interface TrendingResponse {
  success: boolean;
  month: string;
  productCount?: number;
  categories?: string;
  existingArticles?: number;
  trending: TrendingSuggestion[];
  error?: string;
  raw?: string;
}

interface PickerProduct {
  id: string;
  title: string;
  image: string;
  price: number;
  originalPrice: number | null;
  discountPercent: number | null;
  category: string;
  marketplace: string;
  isPinned: boolean;
  isHidden: boolean;
}

interface PickerResponse {
  success: boolean;
  products: PickerProduct[];
  categories: string[];
  total: number;
}

interface BlogForm {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  coverImage: string;
  metaDescription: string;
  author: string;
  tags: string;
  readTime: string;
  content: string;
  isPublished: boolean;
}

const EMPTY_FORM: BlogForm = {
  title: "",
  slug: "",
  category: "Tips Belanja",
  excerpt: "",
  coverImage: "",
  metaDescription: "",
  author: "Tim JelajahBelanja",
  tags: "",
  readTime: "",
  content: "",
  isPublished: true,
};

const DEFAULT_CATEGORIES = [
  "Tips Belanja",
  "Review Produk",
  "Tips Hemat",
  "Trending",
];

// ─── Helpers ───
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function formatShortDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "-";
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRelativeDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "-";
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return "-";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHr < 24) return `${diffHr} jam lalu`;
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return formatShortDate(isoDate);
}

function formatRupiah(n: number): string {
  return "Rp" + n.toLocaleString("id-ID");
}

// ─── Component ───
export function BlogTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ─── Filter state ───
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "published" | "draft">("all");
  const [sourceFilter, setSourceFilter] = React.useState<"all" | "ai" | "manual">("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("");

  // Debounce search input → search state
  React.useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ─── Editor state ───
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingArticle, setEditingArticle] = React.useState<BlogArticle | null>(null);
  const [form, setForm] = React.useState<BlogForm>(EMPTY_FORM);
  const [showPreview, setShowPreview] = React.useState(false);
  const [loadingEdit, setLoadingEdit] = React.useState(false);

  // ─── Delete state ───
  const [deleteTarget, setDeleteTarget] = React.useState<BlogArticle | null>(null);

  // ─── Trending state ───
  const [trendingOpen, setTrendingOpen] = React.useState(false);
  const [generatingTrendingTitle, setGeneratingTrendingTitle] = React.useState<string | null>(null);

  // ─── Product Picker state (untuk pilih cover image dari produk JB) ───
  const [productPickerOpen, setProductPickerOpen] = React.useState(false);
  const [productSearchInput, setProductSearchInput] = React.useState("");
  const [productSearch, setProductSearch] = React.useState("");
  const [productCategoryFilter, setProductCategoryFilter] = React.useState("");

  // Debounce product search
  React.useEffect(() => {
    const t = setTimeout(() => setProductSearch(productSearchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [productSearchInput]);

  // ─── List Query ───
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-blog", search, statusFilter, sourceFilter, categoryFilter],
    queryFn: async (): Promise<BlogListResponse> => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      params.set("limit", "100");
      const res = await fetch(`/api/admin/blog?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal memuat artikel");
      }
      return res.json();
    },
    staleTime: 30 * 1000,
  });

  const articles = data?.articles ?? [];
  const stats = data?.stats ?? { total: 0, published: 0, draft: 0, ai: 0, manual: 0 };
  const categories = data?.categories ?? [];

  // ─── Trending Query (only when dialog open) ───
  const {
    data: trendingData,
    isLoading: trendingLoading,
    error: trendingError,
    refetch: refetchTrending,
  } = useQuery<TrendingResponse>({
    queryKey: ["blog-trending"],
    queryFn: async () => {
      const res = await fetch("/api/blog-trending", { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || `Gagal fetch trending (HTTP ${res.status})`);
      }
      return json as TrendingResponse;
    },
    enabled: trendingOpen,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // ─── Product Picker Query (lazy, hanya saat picker open) ───
  const { data: pickerData, isLoading: pickerLoading } = useQuery<PickerResponse>({
    queryKey: ["blog-cover-products", productSearch, productCategoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (productSearch) params.set("q", productSearch);
      if (productCategoryFilter) params.set("category", productCategoryFilter);
      params.set("limit", "100");
      const res = await fetch(`/api/admin/blog-cover-products?${params.toString()}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => ({ success: false, products: [], categories: [] }));
      if (!res.ok) {
        return { success: false, products: [], categories: [], total: 0 } as PickerResponse;
      }
      return json as PickerResponse;
    },
    enabled: productPickerOpen,
    staleTime: 60 * 1000,
  });

  // ─── Mutations ───
  const createMutation = useMutation({
    mutationFn: async (input: BlogForm) => {
      const res = await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Gagal membuat artikel");
      return json;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog"] });
      toast({
        title: "Artikel dibuat",
        description: data.article?.url ? `URL: ${data.article.url}` : "Artikel baru berhasil ditambahkan.",
      });
      handleCloseEditor();
    },
    onError: (err: Error) => {
      toast({ title: "Gagal membuat artikel", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: { id: string } & Partial<BlogForm>) => {
      const { id, ...body } = input;
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Gagal memperbarui artikel");
      return json;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog"] });
      // Hanya tampilkan toast kalau bukan quick-toggle (quick-toggle pakai field tunggal)
      toast({ title: "Artikel diperbarui" });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal memperbarui", description: err.message, variant: "destructive" });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isPublished }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Gagal toggle publish");
      return json;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog"] });
      toast({
        title: vars.isPublished ? "Artikel dipublish" : "Artikel jadi draft",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal toggle publish", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Gagal menghapus artikel");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog"] });
      toast({ title: "Artikel dihapus" });
      setDeleteTarget(null);
    },
    onError: (err: Error) => {
      toast({ title: "Gagal menghapus", description: err.message, variant: "destructive" });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (
      payload: { title?: string; category?: string; prompt?: string } | null
    ) => {
      const isTrending = !!(payload && payload.title && payload.prompt);
      const url = isTrending ? "/api/blog-trending" : "/api/blog-generate";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: payload && isTrending ? JSON.stringify(payload) : "{}",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Gagal generate artikel (HTTP ${res.status})`);
      return json;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog"] });
      setGeneratingTrendingTitle(null);
      setTrendingOpen(false);
      toast({
        title: "Artikel AI dibuat",
        description: data.article?.title
          ? `${data.article.title}${data.article.url ? ` — ${data.article.url}` : ""}`
          : "Artikel baru berhasil di-generate oleh AI.",
      });
    },
    onError: (err: Error) => {
      setGeneratingTrendingTitle(null);
      toast({ title: "Gagal generate AI", description: err.message, variant: "destructive" });
    },
  });

  // ─── Handlers ───
  function handleCloseEditor() {
    setEditorOpen(false);
    setEditingArticle(null);
    setForm(EMPTY_FORM);
    setShowPreview(false);
  }

  function handleCreateArticle() {
    setEditingArticle(null);
    setForm(EMPTY_FORM);
    setShowPreview(false);
    setEditorOpen(true);
  }

  async function handleEditArticle(a: BlogArticle) {
    setLoadingEdit(true);
    let article: BlogArticle = a;
    // List sudah include content, tapi kalau tidak ada, fetch single
    if (!article.content) {
      try {
        const res = await fetch(`/api/admin/blog/${a.id}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.article) article = { ...article, ...data.article } as BlogArticle;
        }
      } catch {
        // ignore — pakai data dari list
      }
    }
    setEditingArticle(article);
    setForm({
      title: article.title || "",
      slug: article.slug || "",
      category: article.category || "Tips Belanja",
      excerpt: article.excerpt || "",
      coverImage: article.coverImage || "",
      metaDescription: article.metaDescription || "",
      author: article.author || "Tim JelajahBelanja",
      tags: article.tags || "",
      readTime: article.readTime || "",
      content: article.content || "",
      isPublished: !!article.isPublished,
    });
    setShowPreview(false);
    setEditorOpen(true);
    setLoadingEdit(false);
  }

  function handleSubmitArticle() {
    if (!form.title.trim()) {
      toast({ title: "Validasi gagal", description: "Judul wajib diisi.", variant: "destructive" });
      return;
    }
    if (!form.content.trim()) {
      toast({ title: "Validasi gagal", description: "Konten tidak boleh kosong.", variant: "destructive" });
      return;
    }
    if (editingArticle) {
      updateMutation.mutate({ id: editingArticle.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  }

  function handleGenerateRandom() {
    setGeneratingTrendingTitle(null);
    generateMutation.mutate(null);
  }

  function handleGenerateFromTrending(t: TrendingSuggestion) {
    setGeneratingTrendingTitle(t.title);
    generateMutation.mutate({ title: t.title, category: t.category, prompt: t.prompt });
  }

  function handleClearFilters() {
    setSearchInput("");
    setStatusFilter("all");
    setSourceFilter("all");
    setCategoryFilter("");
  }

  const hasActiveFilters = search || statusFilter !== "all" || sourceFilter !== "all" || categoryFilter;
  const metaLen = form.metaDescription.length;
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isRandomGenerating = generateMutation.isPending && generatingTrendingTitle === null;

  // ─── Render ───
  return (
    <div className="flex flex-col gap-4">
      {/* ─── Stats Bar ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<FileText className="w-4 h-4" />}
          label="Total Artikel"
          value={stats.total}
          color="fuchsia"
        />
        <StatCard
          icon={<CheckCircle className="w-4 h-4" />}
          label="Published"
          value={stats.published}
          color="green"
        />
        <StatCard
          icon={<FileEdit className="w-4 h-4" />}
          label="Draft"
          value={stats.draft}
          color="amber"
        />
        <StatCard
          icon={<Sparkles className="w-4 h-4" />}
          label="AI Generated"
          value={stats.ai}
          color="violet"
        />
      </div>

      {/* ─── Toolbar ─── */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:p-6">
        <div className="flex flex-col gap-3">
          {/* Search row */}
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Cari judul / excerpt / tags..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "published" | "draft")}
                className="h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-2 text-xs"
              >
                <option value="all">Semua Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as "all" | "ai" | "manual")}
                className="h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-2 text-xs"
              >
                <option value="all">Semua Sumber</option>
                <option value="ai">AI</option>
                <option value="manual">Manual</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-2 text-xs max-w-[160px]"
              >
                <option value="">Semua Kategori</option>
                {(categories.length > 0 ? categories : DEFAULT_CATEGORIES).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  <X className="w-3.5 h-3.5 mr-1" /> Reset
                </Button>
              )}
            </div>
          </div>

          {/* Action buttons row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">
              Menampilkan <strong className="text-zinc-700 dark:text-zinc-300">{articles.length}</strong> dari{" "}
              <strong className="text-zinc-700 dark:text-zinc-300">{data?.total ?? 0}</strong> artikel
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTrendingOpen(true)}
                disabled={generateMutation.isPending}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-violet-600" /> Trending AI
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateRandom}
                disabled={generateMutation.isPending}
              >
                {isRandomGenerating ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Generating...</>
                ) : (
                  <><Wand2 className="w-3.5 h-3.5 mr-1.5 text-fuchsia-600" /> Generate Acak</>
                )}
              </Button>
              <Button
                size="sm"
                onClick={handleCreateArticle}
                className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Tambah Artikel
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Article List ─── */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:p-6">
        {isLoading ? (
          <div className="text-center py-10 text-sm text-zinc-500">
            <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin text-fuchsia-600" />
            Memuat artikel...
          </div>
        ) : error ? (
          <div className="text-center py-10 text-sm text-red-600">
            <AlertCircle className="w-5 h-5 mx-auto mb-2" />
            {(error as Error).message}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12 text-sm text-zinc-500">
            <FileText className="w-8 h-8 mx-auto mb-3 text-zinc-300 dark:text-zinc-700" />
            <p className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">Belum ada artikel</p>
            <p className="text-xs">
              Klik &lsquo;Tambah Artikel&rsquo; atau &lsquo;Generate Acak&rsquo; untuk membuat artikel pertama.
            </p>
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto custom-scrollbar -mx-1 px-1">
            <ul className="flex flex-col gap-2">
              {articles.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 hover:border-fuchsia-300 dark:hover:border-fuchsia-700 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <h3 className="font-semibold text-sm leading-snug flex-1 min-w-0 line-clamp-2">
                        {a.title}
                      </h3>
                      <span className="text-[10px] text-zinc-500 whitespace-nowrap mt-0.5">
                        {formatRelativeDate(a.publishedAt || a.createdAt)}
                      </span>
                    </div>
                    {a.excerpt && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                        {a.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {a.category && (
                        <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-[10px] px-1.5 py-0 h-4">
                          {a.category}
                        </Badge>
                      )}
                      {a.isPublished ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-[10px] px-1.5 py-0 h-4">
                          Published
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] px-1.5 py-0 h-4">
                          Draft
                        </Badge>
                      )}
                      {a.isAiGenerated ? (
                        <Badge className="bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 text-[10px] px-1.5 py-0 h-4">
                          <Sparkles className="w-2.5 h-2.5" /> AI
                        </Badge>
                      ) : (
                        <Badge className="bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 text-[10px] px-1.5 py-0 h-4">
                          Manual
                        </Badge>
                      )}
                      {a.readTime && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-zinc-500">
                          {a.readTime}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 pt-0.5 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEditArticle(a)}
                      disabled={loadingEdit}
                      title="Edit"
                    >
                      {loadingEdit && editingArticle?.id === a.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Pencil className="w-3.5 h-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      asChild
                      title="Lihat live"
                    >
                      <a
                        href={`/artikel/${a.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        togglePublishMutation.mutate({
                          id: a.id,
                          isPublished: !a.isPublished,
                        })
                      }
                      disabled={togglePublishMutation.isPending}
                      title={a.isPublished ? "Unpublish (jadikan draft)" : "Publish"}
                    >
                      {a.isPublished ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => setDeleteTarget(a)}
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ─── Editor Dialog ─── */}
      <Dialog
        open={editorOpen}
        onOpenChange={(o) => {
          if (!o) handleCloseEditor();
          else setEditorOpen(true);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingArticle ? (
                <><Pencil className="w-4 h-4 text-fuchsia-600" /> Edit Artikel</>
              ) : (
                <><Plus className="w-4 h-4 text-fuchsia-600" /> Tambah Artikel Baru</>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingArticle
                ? "Edit artikel yang sudah ada. Perubahan langsung tampil di blog publik."
                : "Buat artikel manual baru. Konten harus berupa HTML (h2, p, ul, li, strong)."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="blog-title" className="text-xs">Judul Artikel *</Label>
              <Input
                id="blog-title"
                placeholder="10 Tumbler Anak Anti Tumpah Terbaik 2026..."
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            {/* Slug */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="blog-slug" className="text-xs">Slug (URL)</Label>
              <Input
                id="blog-slug"
                placeholder="auto-generated-dari-judul"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="font-mono text-xs"
              />
              <span className="text-xs text-zinc-500">
                URL: /artikel/<span className="text-fuchsia-600 font-mono">
                  {form.slug || slugify(form.title) || "..."}
                </span>
              </span>
            </div>

            {/* Category + Author */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="blog-category" className="text-xs">Kategori</Label>
                <Input
                  id="blog-category"
                  list="blog-categories-list"
                  placeholder="Tips Belanja"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
                <datalist id="blog-categories-list">
                  {(categories.length > 0 ? categories : DEFAULT_CATEGORIES).map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="blog-author" className="text-xs">Author</Label>
                <Input
                  id="blog-author"
                  placeholder="Tim JelajahBelanja"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                />
              </div>
            </div>

            {/* Excerpt */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="blog-excerpt" className="text-xs">Excerpt (ringkasan singkat)</Label>
              <Textarea
                id="blog-excerpt"
                rows={2}
                placeholder="Ringkasan 1-2 kalimat yang menarik..."
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              />
            </div>

            {/* Cover Image URL */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="blog-cover" className="text-xs flex items-center gap-1.5">
                <ImagePlus className="w-3.5 h-3.5" />
                Cover Image (URL)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="blog-cover"
                  type="url"
                  placeholder="https://example.com/gambar-artikel.jpg"
                  value={form.coverImage}
                  onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                  className="font-mono text-xs flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-fuchsia-600 hover:text-fuchsia-700 border-fuchsia-200 hover:border-fuchsia-300 dark:border-fuchsia-800 dark:hover:border-fuchsia-700 whitespace-nowrap"
                  onClick={() => setProductPickerOpen(true)}
                  title="Pilih foto dari produk JB"
                >
                  <Package className="w-3.5 h-3.5 mr-1" />
                  Pilih Produk
                </Button>
                {form.coverImage && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 px-2"
                    onClick={() => setForm({ ...form, coverImage: "" })}
                    title="Hapus cover"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-zinc-500">
                Tempel URL gambar dari Shopee, Tokopedia, Cloudinary, atau klik <strong>"Pilih Produk"</strong> untuk ambil foto dari produk JB.
              </p>
              {/* Preview thumbnail */}
              {form.coverImage && (
                <div className="mt-1 relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 aspect-video">
                  <img
                    src={form.coverImage}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML =
                          '<div class="flex items-center justify-center w-full h-full text-xs text-red-500 gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>URL gambar tidak valid / gagal dimuat</div>';
                      }
                    }}
                  />
                  <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-black/60 text-white">
                    <LinkIcon className="w-2.5 h-2.5" />
                    Preview
                  </span>
                </div>
              )}
            </div>

            {/* Meta Description */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="blog-meta" className="text-xs flex items-center justify-between">
                <span>Meta Description (SEO)</span>
                <span className={`text-[10px] ${metaLen > 160 ? "text-amber-600 font-medium" : "text-zinc-400"}`}>
                  {metaLen}/160
                </span>
              </Label>
              <Textarea
                id="blog-meta"
                rows={2}
                placeholder="Deskripsi SEO untuk Google. Max 160 karakter."
                value={form.metaDescription}
                onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                className={metaLen > 160 ? "border-amber-400" : ""}
              />
              {metaLen > 160 && (
                <p className="text-[10px] text-amber-600">
                  Melebihi 160 karakter — Google mungkin memotong di hasil pencarian.
                </p>
              )}
            </div>

            {/* Tags + Read Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="blog-tags" className="text-xs">Tags</Label>
                <Input
                  id="blog-tags"
                  placeholder="tumbler, anak, anti-tumpah"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                />
                <p className="text-[10px] text-zinc-500">Pisahkan dengan koma.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="blog-readtime" className="text-xs">Read Time</Label>
                <Input
                  id="blog-readtime"
                  placeholder="5 menit (kosongkan untuk auto-compute)"
                  value={form.readTime}
                  onChange={(e) => setForm({ ...form, readTime: e.target.value })}
                />
                <p className="text-[10px] text-zinc-500">Kosongkan untuk auto-compute dari content.</p>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="blog-content" className="text-xs">Content (HTML) *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? (
                    <><Pencil className="w-3 h-3 mr-1" /> Edit</>
                  ) : (
                    <><Eye className="w-3 h-3 mr-1" /> Preview</>
                  )}
                </Button>
              </div>
              {!showPreview && (
                <Textarea
                  id="blog-content"
                  rows={18}
                  placeholder="<h2>Sub-judul</h2><p>Paragraf...</p><ul><li>...</li></ul>"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="font-mono text-xs min-h-[400px]"
                />
              )}
              {showPreview && (
                <div className="min-h-[400px] rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 overflow-y-auto">
                  {form.content.trim() ? (
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: form.content }}
                    />
                  ) : (
                    <p className="text-xs text-zinc-500 italic">
                      Belum ada konten untuk di-preview.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* isPublished Switch */}
            <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <Switch
                id="blog-published"
                checked={form.isPublished}
                onCheckedChange={(c) => setForm({ ...form, isPublished: c })}
              />
              <Label htmlFor="blog-published" className="text-xs cursor-pointer">
                Published (tampilkan publik)
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={handleCloseEditor} disabled={isSaving}>
              <X className="w-3.5 h-3.5 mr-1" /> Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitArticle}
              disabled={isSaving}
              className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
            >
              {isSaving ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Menyimpan...</>
              ) : (
                <><Save className="w-3.5 h-3.5 mr-1" /> {editingArticle ? "Simpan Perubahan" : "Buat Artikel"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Trending Dialog ─── */}
      <Dialog open={trendingOpen} onOpenChange={setTrendingOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-600" /> Topik Trending AI
            </DialogTitle>
            <DialogDescription>
              {trendingData?.month
                ? `${trendingData.month} — disarankan oleh AI berdasarkan tren produk anak Indonesia.`
                : "Disarankan oleh AI berdasarkan tren produk anak Indonesia."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            {trendingLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-6 h-6 mx-auto mb-3 animate-spin text-violet-600" />
                <p className="text-sm text-zinc-500">AI sedang menganalisis trending topik... (~15 detik)</p>
              </div>
            ) : trendingError ? (
              <div className="text-center py-12">
                <AlertCircle className="w-6 h-6 mx-auto mb-3 text-red-600" />
                <p className="text-sm text-red-600 mb-3">
                  {(trendingError as Error).message}
                </p>
                <Button variant="outline" size="sm" onClick={() => refetchTrending()}>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5" /> Coba Lagi
                </Button>
              </div>
            ) : !trendingData?.trending || trendingData.trending.length === 0 ? (
              <div className="text-center py-12 text-sm text-zinc-500">
                <p>AI tidak memberikan saran trending. Coba lagi nanti.</p>
                {trendingData?.raw && (
                  <pre className="text-[10px] text-zinc-400 mt-2 max-h-32 overflow-auto text-left">
                    {trendingData.raw}
                  </pre>
                )}
              </div>
            ) : (
              <>
                {trendingData.existingArticles !== undefined && (
                  <p className="text-xs text-zinc-500">
                    {trendingData.existingArticles} artikel sudah ada di JB — trending berikut dipilih agar tidak duplikat.
                  </p>
                )}
                <ul className="flex flex-col gap-2">
                  {trendingData.trending.map((t, i) => {
                    const isGenerating =
                      generateMutation.isPending && generatingTrendingTitle === t.title;
                    return (
                      <li
                        key={`${t.title}-${i}`}
                        className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm leading-snug">{t.title}</h4>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              {t.category && (
                                <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-[10px] px-1.5 py-0 h-4">
                                  {t.category}
                                </Badge>
                              )}
                              {t.searchVolume && (
                                <Badge
                                  className={
                                    "text-[10px] px-1.5 py-0 h-4 " +
                                    (t.searchVolume === "Tinggi"
                                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                      : t.searchVolume === "Sedang"
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                      : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300")
                                  }
                                >
                                  Volume: {t.searchVolume}
                                </Badge>
                              )}
                            </div>
                            {t.reason && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
                                {t.reason}
                              </p>
                            )}
                            {t.keyword && (
                              <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
                                Keyword: <span className="font-mono">{t.keyword}</span>
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleGenerateFromTrending(t)}
                            disabled={generateMutation.isPending}
                            className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white flex-shrink-0"
                          >
                            {isGenerating ? (
                              <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating...</>
                            ) : (
                              <><Wand2 className="w-3 h-3 mr-1" /> Generate</>
                            )}
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setTrendingOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Product Picker Dialog (pilih cover dari produk JB) ─── */}
      <Dialog open={productPickerOpen} onOpenChange={(o) => {
        setProductPickerOpen(o);
        if (!o) {
          setProductSearchInput("");
          setProductSearch("");
          setProductCategoryFilter("");
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-4 h-4 text-fuchsia-600" />
              Pilih Foto dari Produk JB
            </DialogTitle>
            <DialogDescription>
              Klik produk untuk pakai fotonya sebagai cover image artikel. Total {pickerData?.total ?? 0} produk.
            </DialogDescription>
          </DialogHeader>

          {/* Toolbar: search + category filter */}
          <div className="flex flex-col sm:flex-row gap-2 pb-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <Input
                placeholder="Cari produk (judul / kategori)..."
                value={productSearchInput}
                onChange={(e) => setProductSearchInput(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>
            <select
              value={productCategoryFilter}
              onChange={(e) => setProductCategoryFilter(e.target.value)}
              className="text-xs h-9 px-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
            >
              <option value="">Semua Kategori ({pickerData?.products.length ?? 0})</option>
              {(pickerData?.categories ?? []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Product grid — scrollable */}
          <div className="flex-1 overflow-y-auto max-h-[60vh] custom-scrollbar">
            {pickerLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-zinc-500">
                <Loader2 className="w-6 h-6 animate-spin text-fuchsia-600" />
                <p className="text-xs">Memuat produk...</p>
              </div>
            ) : !pickerData?.products || pickerData.products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-zinc-500">
                <Package className="w-8 h-8 text-zinc-300" />
                <p className="text-xs">
                  {productSearch || productCategoryFilter
                    ? "Tidak ada produk yang cocok dengan filter."
                    : "Belum ada produk di JB."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-1">
                {pickerData.products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setForm({ ...form, coverImage: p.image });
                      setProductPickerOpen(false);
                      setProductSearchInput("");
                      setProductSearch("");
                      setProductCategoryFilter("");
                      toast({
                        title: "Cover image dipilih",
                        description: p.title.slice(0, 60) + (p.title.length > 60 ? "..." : ""),
                      });
                    }}
                    className="group flex flex-col text-left rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-fuchsia-400 hover:shadow-md transition-all"
                  >
                    {/* Product image */}
                    <div className="relative aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                      <img
                        src={p.image}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                        onError={(e) => {
                          const t = e.currentTarget as HTMLImageElement;
                          t.style.display = "none";
                          if (t.parentElement) {
                            t.parentElement.innerHTML = '<div class="flex items-center justify-center w-full h-full text-zinc-400 text-[10px]">No image</div>';
                          }
                        }}
                      />
                      {/* Badges overlay */}
                      <div className="absolute top-1 left-1 flex flex-col gap-0.5">
                        {p.isPinned && (
                          <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-fuchsia-600 text-white">PIN</span>
                        )}
                        {p.isHidden && (
                          <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-zinc-600 text-white">HIDDEN</span>
                        )}
                      </div>
                      {/* Hover hint */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <span className="text-[10px] font-semibold text-white bg-fuchsia-600 px-2 py-1 rounded">
                          Pilih
                        </span>
                      </div>
                    </div>
                    {/* Product info */}
                    <div className="p-2 flex flex-col gap-0.5">
                      <p className="text-[11px] font-medium line-clamp-2 leading-tight text-zinc-700 dark:text-zinc-300">
                        {p.title}
                      </p>
                      <p className="text-[11px] font-bold text-fuchsia-600">
                        {formatRupiah(p.price)}
                      </p>
                      <div className="flex items-center gap-1 flex-wrap mt-0.5">
                        <span className="text-[8px] px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {p.category}
                        </span>
                        <span className="text-[8px] px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase">
                          {p.marketplace}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setProductPickerOpen(false)}>
              <X className="w-3.5 h-3.5 mr-1" /> Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ─── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Artikel</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin menghapus <strong>&ldquo;{deleteTarget?.title}&rdquo;</strong>? Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Menghapus...</>
              ) : (
                "Hapus"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── StatCard sub-component ───
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "fuchsia" | "green" | "amber" | "violet";
}) {
  const colorClasses: Record<typeof color, string> = {
    fuchsia: "text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-900/20",
    green: "text-green-600 bg-green-50 dark:bg-green-900/20",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
    violet: "text-violet-600 bg-violet-50 dark:bg-violet-900/20",
  };
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 md:p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] md:text-xs text-zinc-500 dark:text-zinc-400 truncate">{label}</p>
        <p className="font-bold text-lg md:text-xl leading-tight">{value}</p>
      </div>
    </div>
  );
}

export default BlogTab;
