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
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { CategoryDTO, CreateCategoryInput } from "@/lib/types";

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
  enabled: true,
};

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Gagal memuat kategori");
      const json = await res.json();
      return json.categories as CategoryDTO[];
    },
    staleTime: 60 * 60 * 1000, // 1 jam
  });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<CreateCategoryInput>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = React.useState<CategoryDTO | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = React.useState(false);

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

  const categories = data ?? [];

  function handleEdit(c: CategoryDTO) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      emoji: c.emoji,
      keywords: c.keywords,
      amazonNode: c.amazonNode ?? "",
      aliexpressCat: c.aliexpressCat ?? "",
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
    if (!data) return;
    const next = [...data];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorderMutation.mutate(next);
  }

  function handleToggleEnabled(c: CategoryDTO, enabled: boolean) {
    updateMutation.mutate({ id: c.id, enabled });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Pengaturan Kategori
          </DialogTitle>
          <DialogDescription>
            Kelola kategori produk, keyword pencarian, dan sumber marketplace.
            Perubahan disimpan otomatis ke database.
          </DialogDescription>
        </DialogHeader>

        {/* Form tambah/edit */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 md:p-4 bg-zinc-50 dark:bg-zinc-900/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cat-emoji" className="text-xs">
                Emoji
              </Label>
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
              <Label htmlFor="cat-name" className="text-xs">
                Nama Kategori
              </Label>
              <Input
                id="cat-name"
                placeholder="Elektronik"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label htmlFor="cat-keywords" className="text-xs">
                Keywords (pisahkan dengan koma)
              </Label>
              <Input
                id="cat-keywords"
                placeholder="electronics,gadget,smartphone"
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cat-amazon" className="text-xs">
                Amazon Best Sellers Node
              </Label>
              <Input
                id="cat-amazon"
                placeholder="172282"
                value={form.amazonNode ?? ""}
                onChange={(e) => setForm({ ...form, amazonNode: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cat-aliexpress" className="text-xs">
                AliExpress Category Slug
              </Label>
              <Input
                id="cat-aliexpress"
                placeholder="consumer-electronics"
                value={form.aliexpressCat ?? ""}
                onChange={(e) => setForm({ ...form, aliexpressCat: e.target.value })}
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
                  <>
                    <Save className="w-3.5 h-3.5 mr-1" /> Simpan
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Tambah
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* List kategori */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="text-center py-8 text-sm text-zinc-500">Memuat...</div>
          ) : (
            <ul className="flex flex-col gap-2 pr-1">
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
                        Order #{c.order}
                      </Badge>
                      {c.amazonNode && (
                        <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 hover:bg-orange-100 text-[10px] px-1.5 py-0 h-4">
                          Amazon
                        </Badge>
                      )}
                      {c.aliexpressCat && (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-100 text-[10px] px-1.5 py-0 h-4">
                          AliExpress
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

        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setResetConfirmOpen(true)}
            disabled={resetMutation.isPending}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset ke Default
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Confirm delete */}
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

      {/* Confirm reset */}
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
