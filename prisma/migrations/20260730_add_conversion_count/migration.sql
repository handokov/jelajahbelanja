-- Migration: Add conversionCount + conversionValue ke ShopeeProduct
-- Untuk input manual konversi dari AT dashboard (AT tidak push conversion ke JB)
-- User cek AT dashboard -> input angka konversi manual per produk di tab Klik

ALTER TABLE "ShopeeProduct" ADD COLUMN IF NOT EXISTS "conversionCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ShopeeProduct" ADD COLUMN IF NOT EXISTS "conversionValue" INTEGER NOT NULL DEFAULT 0;
