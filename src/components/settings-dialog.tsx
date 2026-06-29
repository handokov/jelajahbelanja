"use client";

import * as React from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Settings2,
  ExternalLink,
  LayoutDashboard,
} from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Pengaturan
          </DialogTitle>
          <DialogDescription>
            Kelola kategori, affiliate tag, dan pengaturan lainnya.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-4">
          <Link href="/admin" onClick={() => onOpenChange(false)}>
            <Button variant="outline" className="w-full justify-start gap-3 h-14">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/30">
                <LayoutDashboard className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-semibold text-sm">Panel Admin</span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Kelola kategori, affiliate &amp; lainnya
                </span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 ml-auto text-zinc-400" />
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
