-- Migration: Add ProductBadge table + lastScrapedAt column
-- Idempotent (IF NOT EXISTS) supaya aman kalau tabel/kolom sudah ada

-- Tambah kolom lastScrapedAt di ShopeeProduct (kalau belum ada)
ALTER TABLE "ShopeeProduct" ADD COLUMN IF NOT EXISTS "lastScrapedAt" TIMESTAMP(3);

-- Buat tabel ProductBadge (kalau belum ada)
CREATE TABLE IF NOT EXISTS "ProductBadge" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "emoji" TEXT,
    "bgColor" TEXT NOT NULL DEFAULT '#ef4444',
    "textColor" TEXT NOT NULL DEFAULT '#ffffff',
    "marketplaces" TEXT NOT NULL DEFAULT 'shopee',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductBadge_pkey" PRIMARY KEY ("id")
);

-- Index untuk query active badges by order
CREATE INDEX IF NOT EXISTS "ProductBadge_isActive_order_idx" ON "ProductBadge"("isActive", "order");
