"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Settings2,
  Package,
  Image as ImageLucide,
  FileSpreadsheet,
  Shield,
  Link2,
  ShoppingBag,
  LogOut,
  Megaphone,
  Zap,
  Newspaper,
  BarChart3,
} from "lucide-react";
import { BulkUploadTab } from "@/components/bulk-upload-tab";
import { SecurityTab } from "@/components/security-tab";
import { ProductsTab } from "@/components/admin/products-tab";
import { AtSyncTab } from "@/components/admin/at-sync-tab";
import { BannersTab } from "@/components/admin/banners-tab";
import { CategoriesTab } from "@/components/admin/categories-tab";
import { AffiliateTab } from "@/components/admin/affiliate-tab";
import { AffiliateAdsTab } from "@/components/admin/affiliate-ads-tab";
import { BlogTab } from "@/components/admin/blog-tab";
import { ClickReportTab } from "@/components/admin/click-report-tab";

export default function AdminPage() {
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
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Panel Admin
            </span>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={async () => {
                document.cookie = "jb-admin-session=; path=/; max-age=0";
                window.location.href = "/jb-mgr-login";
              }}
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 max-w-5xl py-6">
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full max-w-4xl grid-cols-10 h-11">
            <TabsTrigger value="products" className="text-sm">
              <Package className="w-4 h-4 mr-1.5" />
              Produk
            </TabsTrigger>
            <TabsTrigger value="at-sync" className="text-sm">
              <Zap className="w-4 h-4 mr-1.5" />
              AT Sync
            </TabsTrigger>
            <TabsTrigger value="bulk-upload" className="text-sm">
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              Upload Massal
            </TabsTrigger>
            <TabsTrigger value="banners" className="text-sm">
              <ImageLucide className="w-4 h-4 mr-1.5" />
              Banner
            </TabsTrigger>
            <TabsTrigger value="affiliate-ads" className="text-sm">
              <Megaphone className="w-4 h-4 mr-1.5" />
              Iklan Affiliate
            </TabsTrigger>
            <TabsTrigger value="categories" className="text-sm">
              <Settings2 className="w-4 h-4 mr-1.5" />
              Kategori
            </TabsTrigger>
            <TabsTrigger value="affiliate" className="text-sm">
              <Link2 className="w-4 h-4 mr-1.5" />
              Link Affiliate
            </TabsTrigger>
            <TabsTrigger value="blog" className="text-sm">
              <Newspaper className="w-4 h-4 mr-1.5" />
              Blog
            </TabsTrigger>
            <TabsTrigger value="click-report" className="text-sm">
              <BarChart3 className="w-4 h-4 mr-1.5" />
              Klik
            </TabsTrigger>
            <TabsTrigger value="security" className="text-sm">
              <Shield className="w-4 h-4 mr-1.5" />
              Keamanan
            </TabsTrigger>
          </TabsList>

          {/* Tab contents — each self-contained with its own queries/mutations/state */}
          <TabsContent value="products" className="space-y-4">
            <ProductsTab />
          </TabsContent>

          <TabsContent value="at-sync" className="space-y-4">
            <AtSyncTab />
          </TabsContent>

          <TabsContent value="bulk-upload" className="space-y-4">
            <BulkUploadTab adminFetch={async (url, options) => fetch(url, { ...options, credentials: "include" })} />
          </TabsContent>

          <TabsContent value="banners" className="space-y-4">
            <BannersTab />
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <CategoriesTab />
          </TabsContent>

          <TabsContent value="affiliate-ads" className="space-y-4">
            <AffiliateAdsTab />
          </TabsContent>

          <TabsContent value="affiliate" className="space-y-4">
            <AffiliateTab />
          </TabsContent>

          <TabsContent value="blog" className="space-y-4">
            <BlogTab />
          </TabsContent>

          <TabsContent value="click-report" className="space-y-4">
            <ClickReportTab />
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <SecurityTab adminFetch={async (url, options) => fetch(url, { ...options, credentials: "include" })} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
