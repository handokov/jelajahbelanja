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
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Pencil,
  Save,
  Plus,
  X,
  Trash2,
  Settings2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { CategoryDTO, CreateCategoryInput } from "@/lib/types";

const EMPTY_FORM: CreateCategoryInput = {
  name: "",
  emoji: "",
  keywords: "",
  amazonNode: "",
  aliexpressCat: "",
  shopeeCat: "",
  tokopediaCat: "",
  lazadaCat: "",
  accesstradeCat: "",
  enabled: true,
};

export function CategoriesTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ─── State ───
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<CreateCategoryInput>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = React.useState<CategoryDTO | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = React.useState(false);
  const [showAtCategories, setShowAtCategories] = React.useState(false);
  const [atCategories, setAtCategories] = React.useState<any[]>([]);
  const [atCategoriesLoading, setAtCategoriesLoading] = React.useState(false);

  // ─── Query ───
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

  const categories = categoriesData ?? [];

  // ─── Mutations ───
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

  // ─── Handlers ───
  function handleEditCat(c: CategoryDTO) {
    setEditingId(c.id);
    setForm({
      name: c.name, emoji: c.emoji, keywords: c.keywords,
      amazonNode: c.amazonNode ?? "", aliexpressCat: c.aliexpressCat ?? "",
      shopeeCat: c.shopeeCat ?? "", tokopediaCat: c.tokopediaCat ?? "",
      lazadaCat: c.lazadaCat ?? "", accesstradeCat: c.accesstradeCat ?? "",
      enabled: c.enabled,
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

  return (
    <>
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
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <Label htmlFor="cat-accesstrade" className="text-xs flex items-center gap-1.5">
              Accesstrade Categories (pisahkan dengan koma)
              <a
                href="/api/at-categories"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-violet-600 hover:underline"
                onClick={(e) => { e.preventDefault(); setShowAtCategories(true); }}
              >
                (lihat kategori AT yang tersedia)
              </a>
            </Label>
            <Input id="cat-accesstrade" placeholder="Mobile & Gadgets,Computers & Accessories" value={form.accesstradeCat ?? ""} onChange={(e) => setForm({ ...form, accesstradeCat: e.target.value })} />
            <p className="text-[10px] text-zinc-500">
              Kategori AT untuk auto-mapping saat sync produk dari AccessTrade API.
              Kategori AT utama: E-COMMERCE, TRAVEL and LEISURE, FINANCIAL SERVICES, ONLINE SERVICES, GAMES.
              Kategori produk AT: Women's Fashion, Mobile &amp; Gadgets, Beauty, Home &amp; Living, dll.
            </p>
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
                    {c.accesstradeCat && <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 text-[10px] px-1.5 py-0 h-4">AT</Badge>}
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

      {/* AT Categories info dialog */}
      <AlertDialog open={showAtCategories} onOpenChange={setShowAtCategories}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Kategori AccessTrade yang Tersedia</AlertDialogTitle>
            <AlertDialogDescription>
              Kategori dari campaign AccessTrade yang sudah Anda approved. Pakai nama ini di field "Accesstrade Categories" untuk auto-mapping produk saat sync.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Button
              size="sm"
              variant="outline"
              className="mb-3"
              disabled={atCategoriesLoading}
              onClick={async () => {
                setAtCategoriesLoading(true);
                try {
                  const res = await fetch("/api/at-categories");
                  const data = await res.json();
                  setAtCategories(data.categories || []);
                } catch (err) {
                  toast({ title: "Gagal fetch kategori AT", variant: "destructive" });
                } finally {
                  setAtCategoriesLoading(false);
                }
              }}
            >
              {atCategoriesLoading ? "Memuat..." : "Fetch dari AccessTrade"}
            </Button>

            {atCategories.length > 0 ? (
              <div className="space-y-2">
                {atCategories.map((cat: any) => (
                  <div key={cat.name} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold">{cat.name}</span>
                      <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-[10px]">
                        {cat.campaignCount} campaign
                      </Badge>
                    </div>
                    {cat.examples && cat.examples.length > 0 && (
                      <p className="text-[10px] text-zinc-500">
                        Contoh: {cat.examples.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">
                Klik "Fetch dari AccessTrade" untuk load kategori live dari API AT.
              </p>
            )}

            {/* Reference kategori produk AT (dari dokumentasi) */}
            <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <p className="text-xs font-semibold mb-1.5">Kategori Produk AT (untuk product feed):</p>
              <div className="flex flex-wrap gap-1">
                {[
                  "Women's Fashion", "Men's Fashion", "Muslim Fashion", "Kids Fashion",
                  "Mobile & Gadgets", "Computers & Accessories", "Electronic Accessories",
                  "Cameras & Drones", "Smart Devices", "Watches",
                  "Beauty", "Health", "Health & Personal Care",
                  "Home & Living", "Home Appliances", "Pets", "Food & Beverages",
                  "Groceries", "Books & Stationery", "Gaming",
                  "Sports & Outdoors", "Mom & Baby", "Toys & Games", "Kids & Baby",
                  "Automotive", "Travel & Luggage", "Jewelry & Accessories",
                ].map(cat => (
                  <Badge key={cat} className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 text-[9px] cursor-pointer hover:bg-violet-100 hover:text-violet-700"
                    onClick={() => {
                      const current = form.accesstradeCat || "";
                      const newVal = current ? `${current},${cat}` : cat;
                      setForm({ ...form, accesstradeCat: newVal });
                    }}
                  >
                    + {cat}
                  </Badge>
                ))}
              </div>
              <p className="text-[10px] text-zinc-500 mt-2">
                Klik badge untuk tambahkan ke field "Accesstrade Categories" di form.
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Tutup</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
