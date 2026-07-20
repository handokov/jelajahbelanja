-- Migration: Add ProductClick table for click analytics per produk
-- Log setiap klik "Beli di marketplace" dari /beli/[id] route
-- Admin bisa lihat: top produk by clicks, grafik klik per hari, unique IP, dll

CREATE TABLE IF NOT EXISTS "ProductClick" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "referer" TEXT,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "blockReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductClick_pkey" PRIMARY KEY ("id")
);

-- Indexes untuk query yang sering dipakai
CREATE INDEX IF NOT EXISTS "ProductClick_productId_idx" ON "ProductClick"("productId");
CREATE INDEX IF NOT EXISTS "ProductClick_createdAt_idx" ON "ProductClick"("createdAt");
CREATE INDEX IF NOT EXISTS "ProductClick_marketplace_idx" ON "ProductClick"("marketplace");
