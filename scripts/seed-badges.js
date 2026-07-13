// Seed sample product badges
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const badges = [
  // Shopee-style badges (red, bold)
  { label: "PROMO XTRA", emoji: "🔥", bgColor: "#ee2e24", textColor: "#ffffff", marketplaces: "shopee", order: 1, isActive: true },
  { label: "Pilih Lokal", emoji: "🇮🇩", bgColor: "#ee2e24", textColor: "#ffffff", marketplaces: "shopee", order: 2, isActive: true },
  { label: "Flash Sale", emoji: "⚡", bgColor: "#ff5722", textColor: "#ffffff", marketplaces: "shopee,tiktok", order: 0, isActive: true },
  // Tokopedia-style badges (green, with discount)
  { label: "Promo Guncang 7.7", emoji: "🎉", bgColor: "#03ac0e", textColor: "#ffffff", marketplaces: "tokopedia", order: 0, isActive: true },
  { label: "Gratis Ongkir", emoji: "🚚", bgColor: "#03ac0e", textColor: "#ffffff", marketplaces: "tokopedia,shopee,lazada", order: 1, isActive: true },
  // Lazada-style
  { label: "Cashback", emoji: "💵", bgColor: "#0f146d", textColor: "#ffffff", marketplaces: "lazada,tokopedia", order: 3, isActive: true },
  // TikTok Shop
  { label: "TikTok Shop Special", emoji: "🎵", bgColor: "#000000", textColor: "#ffffff", marketplaces: "tiktok", order: 0, isActive: true },
  // Cross-marketplace
  { label: "Best Seller", emoji: "🏆", bgColor: "#f59e0b", textColor: "#1f2937", marketplaces: "shopee,tokopedia,lazada,tiktok", order: 5, isActive: true },
];

(async () => {
  try {
    const existing = await p.productBadge.count();
    if (existing > 0) {
      console.log(`Already ${existing} badges in DB, skipping seed.`);
      return;
    }
    const result = await p.productBadge.createMany({ data: badges });
    console.log(`✓ Seeded ${result.count} sample badges`);
    const verify = await p.productBadge.count();
    console.log(`Total badges now: ${verify}`);
  } catch (e) {
    console.error('ERR:', e.message);
    process.exit(1);
  } finally {
    await p.$disconnect();
  }
})();
