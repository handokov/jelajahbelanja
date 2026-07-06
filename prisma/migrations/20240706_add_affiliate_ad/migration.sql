-- CreateTable
CREATE TABLE "AffiliateAd" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'accesstrade',
    "href" TEXT NOT NULL,
    "imgSrc" TEXT NOT NULL,
    "trackingPixel" TEXT,
    "width" INTEGER NOT NULL DEFAULT 300,
    "height" INTEGER NOT NULL DEFAULT 250,
    "position" TEXT NOT NULL DEFAULT 'sidebar',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateAd_pkey" PRIMARY KEY ("id")
);