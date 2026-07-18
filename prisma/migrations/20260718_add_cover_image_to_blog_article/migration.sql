-- Migration: Add coverImage column to BlogArticle
-- Idempotent (IF NOT EXISTS) supaya aman kalau kolom sudah ada
-- Memungkinkan admin upload cover image dari URL (Shopee/Tokopedia/Cloudinary/external)
-- untuk ditampilkan di list artikel & detail page (style blog berita)

ALTER TABLE "BlogArticle" ADD COLUMN IF NOT EXISTS "coverImage" TEXT;
