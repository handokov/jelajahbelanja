-- Migration: Add adType + scriptCode ke AffiliateAd
-- Support script-based ads (Adsterra, dll) selain image banner
-- adType: "image" (default) atau "script"
-- scriptCode: HTML script untuk Adsterra (atOptions + invoke.js)

ALTER TABLE "AffiliateAd" ADD COLUMN IF NOT EXISTS "adType" TEXT NOT NULL DEFAULT 'image';
ALTER TABLE "AffiliateAd" ADD COLUMN IF NOT EXISTS "scriptCode" TEXT;
ALTER TABLE "AffiliateAd" ALTER COLUMN "href" SET DEFAULT '';
ALTER TABLE "AffiliateAd" ALTER COLUMN "imgSrc" SET DEFAULT '';
