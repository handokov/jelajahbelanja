"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

const MARKETPLACE_INFO: Array<{
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

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<CreateCategoryInput>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = React.useState<CategoryDTO | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = React.useState(false);

  // Local state untuk affiliate tags (dipakai saat user edit)
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

  const createMutation = useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal membuat kategori");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Kategori dibuat", description: "Kategori baru berhasil ditambahkan." });
      setForm(EMPTY_FORM);
    },
    onError: (err: Error) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: Partial<CreateCategoryInput> & { id: string }) => {
      const res = await fetch("/api/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal memperbarui kategori");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Kategori diperbarui" });
      setEditingId(null);
      setForm(EMPTY_FORM);
    },
    onError: (err: Error) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menghapus kategori");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Kategori dihapus" });
      setDeleteTarget(null);
    },
    onError: (err: Error) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (categories: CategoryDTO[]) => {
      const payload = categories.map((c, i) => ({ id: c.id, order: i }));
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
      toast({ title: "Kategori direset ke default" });
      setResetConfirmOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });

  const updateAffiliateMutation = useMutation({
    mutationFn: async (input: UpdateAffiliateTagInput) => {
      const res = await fetch("/api/affiliate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan tag affiliate");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affiliate-tags"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Tag affiliate disimpan" });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
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

  const categories = categoriesData ?? [];

  function handleEdit(c: CategoryDTO) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      emoji: c.emoji,
      keywords: c.keywords,
      amazonNode: c.amazonNode ?? "",
      aliexpressCat: c.aliexpressCat ?? "",
      shopeeCat: c.shopeeCat ?? "",
      tokopediaCat: c.tokopediaCat ?? "",
      lazadaCat: c.lazadaCat ?? "",
      enabled: c.enabled,
    });
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.emoji.trim() || !form.keywords.trim()) {
      toast({
        title: "Validasi gagal",
        description: "Nama, emoji, dan keywords wajib diisi.",
        variant: "destructive",
      });
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      createMutation.mutate(form);
    }
  }

  function handleMove(index: number, direction: "up" | "down") {
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

  function handleSaveAffiliate(m: Marketplace) {
    const draft = affDrafts[m];
    if (!draft) return;
    updateAffiliateMutation.mutate({
      marketplace: m,
      tag: draft.tag,
      enabled: draft.enabled,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Pengaturan JelajahBelanja
          </DialogTitle>
          <DialogDescription>
            Kelola kategori produk dan tag affiliate untuk monetisasi.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="categories" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="categories" className="text-xs md:text-sm">
              <Settings2 className="w-3.5 h-3.5 mr-1" />
              Kategori
            </TabsTrigger>
            <TabsTrigger value="affiliate" className="text-xs md:text-sm">
              <Link2 className="w-3.5 h-3.5 mr-1" />
              Affiliate Tags
            </TabsTrigger>
          </TabsList>

          {/* ===== TAB KATEGORI ===== */}
          <TabsContent value="categories" className="flex-1 overflow-hidden flex flex-col mt-2">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 md:p-4 bg-zinc-50 dark:bg-zinc-900/50 mb-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cat-emoji" className="text-xs">Emoji</Label>
                  <Input
                    id="cat-emoji"
                    placeholder="🔌"
                    value={form.emoji}
                    onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                    className="w-16 text-center text-xl"
                    maxLength={2}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cat-name" className="text-xs">Nama Kategori</Label>
                  <Input
                    id="cat-name"
                    placeholder="Elektronik"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <Label htmlFor="cat-keywords" className="text-xs">Keywords (pisahkan dengan koma)</Label>
                  <Input
                    id="cat-keywords"
                    placeholder="elektronik,gadget,smartphone"
                    value={form.keywords}
                    onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cat-shopee" className="text-xs">Shopee Category</Label>
                  <Input
                    id="cat-shopee"
                    placeholder="elektronik"
                    value={form.shopeeCat ?? ""}
                    onChange={(e) => setForm({ ...form, shopeeCat: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cat-tokopedia" className="text-xs">Tokopedia Category</Label>
                  <Input
                    id="cat-tokopedia"
                    placeholder="elektronik"
                    value={form.tokopediaCat ?? ""}
                    onChange={(e) => setForm({ ...form, tokopediaCat: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cat-lazada" className="text-xs">Lazada Category</Label>
                  <Input
                    id="cat-lazada"
                    placeholder="elektronik"
                    value={form.lazadaCat ?? ""}
                    onChange={(e) => setForm({ ...form, lazadaCat: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cat-amazon" className="text-xs">Amazon Node (opsional)</Label>
                  <Input
                    id="cat-amazon"
                    placeholder="172282"
                    value={form.amazonNode ?? ""}
                    onChange={(e) => setForm({ ...form, amazonNode: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 gap-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Switch
                    checked={form.enabled}
                    onCheckedChange={(checked) => setForm({ ...form, enabled: checked })}
                  />
                  Aktif
                </label>
                <div className="flex gap-2">
                  {(editingId || form.name) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingId(null);
                        setForm(EMPTY_FORM);
                      }}
                    >
                      <X className="w-3.5 h-3.5 mr-1" /> Batal
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingId ? (
                      <><Save className="w-3.5 h-3.5 mr-1" /> Simpan</>
                    ) : (
                      <><Plus className="w-3.5 h-3.5 mr-1" /> Tambah</>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 pr-1">
              {categoriesLoading ? (
                <div className="text-center py-8 text-sm text-zinc-500">Memuat...</div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {categories.map((c, i) => (
                    <li
                      key={c.id}
                      className="flex items-start gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                    >
                      <div className="flex flex-col gap-0.5 pt-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleMove(i, "up")}
                          disabled={i === 0}
                          aria-label="Pindah ke atas"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleMove(i, "down")}
                          disabled={i === categories.length - 1}
                          aria-label="Pindah ke bawah"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xl">{c.emoji}</span>
                          <span className="font-semibold text-sm">{c.name}</span>
                          <Badge variant="outline" className="text-[10px]">
                            #{c.order}
                          </Badge>
                          {c.shopeeCat && (
                            <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 hover:bg-orange-100 text-[10px] px-1.5 py-0 h-4">
                              Shopee
                            </Badge>
                          )}
                          {c.tokopediaCat && (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-100 text-[10px] px-1.5 py-0 h-4">
                              Tokopedia
                            </Badge>
                          )}
                          {c.lazadaCat && (
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-100 text-[10px] px-1.5 py-0 h-4">
                              Lazada
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                          Keywords: {c.keywords}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Switch
                          checked={c.enabled}
                          onCheckedChange={(checked) => handleToggleEnabled(c, checked)}
                          aria-label="Toggle aktif"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEdit(c)}
                          aria-label="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-600 hover:text-red-700"
                          onClick={() => setDeleteTarget(c)}
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

          {/* ===== TAB AFFILIATE ===== */}
          <TabsContent value="affiliate" className="flex-1 overflow-y-auto min-h-0 mt-2">
            <div className="rounded-xl border border-fuchsia-200 dark:border-fuchsia-900/50 bg-fuchsia-50 dark:bg-fuchsia-900/20 p-3 mb-3">
              <p className="text-xs text-fuchsia-900 dark:text-fuchsia-100">
                💡 <strong>Cara kerja:</strong> Setelah tag affiliate terisi,
                semua link "Beli Sekarang" di JelajahBelanja otomatis disisipi
                parameter tracking Anda. Setiap transaksi yang berasal dari link
                ini akan memberikan komisi ke Anda.
              </p>
            </div>

            {affiliateLoading ? (
              <div className="text-center py-8 text-sm text-zinc-500">Memuat...</div>
            ) : (
              <div className="flex flex-col gap-3">
                {MARKETPLACE_INFO.map((m) => {
                  const draft = affDrafts[m.id] ?? { tag: "", enabled: false };
                  const isSaved = affiliateData?.find((t) => t.marketplace === m.id)?.tag === draft.tag &&
                    affiliateData?.find((t) => t.marketplace === m.id)?.enabled === draft.enabled;
                  return (
                    <div
                      key={m.id}
                      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{m.label}</span>
                          {draft.tag && draft.enabled && (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-100 text-[10px]">
                              <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                              Aktif
                            </Badge>
                          )}
                        </div>
                        <a
                          href={m.signupUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-fuchsia-600 dark:text-fuchsia-400 hover:underline inline-flex items-center gap-0.5"
                        >
                          Daftar
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                        {m.hint}
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          ?{m.param}=
                        </code>
                        <Input
                          placeholder={`Tag ${m.label} Anda`}
                          value={draft.tag}
                          onChange={(e) =>
                            setAffDrafts({
                              ...affDrafts,
                              [m.id]: { ...draft, tag: e.target.value },
                            })
                          }
                          className="h-8 text-sm"
                        />
                        <Switch
                          checked={draft.enabled}
                          onCheckedChange={(checked) =>
                            setAffDrafts({
                              ...affDrafts,
                              [m.id]: { ...draft, enabled: checked },
                            })
                          }
                          aria-label="Aktifkan tag"
                        />
                        <Button
                          size="sm"
                          variant={isSaved ? "outline" : "default"}
                          onClick={() => handleSaveAffiliate(m.id)}
                          disabled={updateAffiliateMutation.isPending}
                          className="h-8"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => resetAffiliateMutation.mutate()}
                disabled={resetAffiliateMutation.isPending}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Reset Semua Tag
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setResetConfirmOpen(true)}
            disabled={resetMutation.isPending}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset Kategori ke Default
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus kategori?</AlertDialogTitle>
            <AlertDialogDescription>
              Kategori <strong>{deleteTarget?.emoji} {deleteTarget?.name}</strong>{" "}
              akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset semua kategori?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua kategori akan dihapus dan diganti dengan 8 kategori default.
              Perubahan kustom Anda akan hilang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => resetMutation.mutate()}>
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
