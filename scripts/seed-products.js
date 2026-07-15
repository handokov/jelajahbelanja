// Seed 12 sample products across categories to make grid non-empty
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const products = [
  { title: "JBL Tune 510BT Wireless Headphone", url: "https://shopee.co.id/product/1", image: "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&q=80", price: 349000, originalPrice: 599000, discountPercent: 42, rating: 4.9, reviewCount: 12453, soldCount: 25000, location: "Jakarta", category: "Elektronik", isViral: true, marketplace: "shopee", affiliateUrl: "https://shope.ee/xyz1" },
  { title: "Xiaomi Redmi Buds 4 Active", url: "https://shopee.co.id/product/2", image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80", price: 199000, originalPrice: 299000, discountPercent: 33, rating: 4.8, reviewCount: 8721, soldCount: 15000, location: "Tangerang", category: "Elektronik", isViral: true, marketplace: "shopee", affiliateUrl: "https://shope.ee/xyz2" },
  { title: "Smartwatch M4 Pro 2024", url: "https://shopee.co.id/product/3", image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&q=80", price: 89000, originalPrice: 250000, discountPercent: 64, rating: 4.6, reviewCount: 23104, soldCount: 50000, location: "Surabaya", category: "Elektronik", isViral: false, marketplace: "shopee", affiliateUrl: "https://shope.ee/xyz3" },
  { title: "Kaos Oversize Premium Cotton", url: "https://shopee.co.id/product/4", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80", price: 79000, originalPrice: 150000, discountPercent: 47, rating: 4.9, reviewCount: 5621, soldCount: 12000, location: "Bandung", category: "Fashion", isViral: true, marketplace: "shopee", affiliateUrl: "https://shope.ee/xyz4" },
  { title: "Sepatu Sneakers Pria Wanita", url: "https://shopee.co.id/product/5", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80", price: 159000, originalPrice: 350000, discountPercent: 55, rating: 4.8, reviewCount: 18923, soldCount: 35000, location: "Jakarta", category: "Fashion", isViral: true, marketplace: "shopee", affiliateUrl: "https://shope.ee/xyz5" },
  { title: "Tas Selempang Canvas Korea", url: "https://shopee.co.id/product/6", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&q=80", price: 65000, originalPrice: 145000, discountPercent: 55, rating: 4.7, reviewCount: 4210, soldCount: 8900, location: "Yogyakarta", category: "Fashion", isViral: false, marketplace: "shopee", affiliateUrl: "https://shope.ee/xyz6" },
  { title: "Skintific 5X Ceramide Serum", url: "https://shopee.co.id/product/7", image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&q=80", price: 109000, originalPrice: 189000, discountPercent: 42, rating: 4.9, reviewCount: 32104, soldCount: 75000, location: "Jakarta", category: "Beauty", isViral: true, marketplace: "shopee", affiliateUrl: "https://shope.ee/xyz7" },
  { title: "Sunscreen SPF50+ PA++++ 60ml", url: "https://shopee.co.id/product/8", image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80", price: 45000, originalPrice: 99000, discountPercent: 55, rating: 4.8, reviewCount: 15234, soldCount: 42000, location: "Bandung", category: "Beauty", isViral: true, marketplace: "shopee", affiliateUrl: "https://shope.ee/xyz8" },
  { title: "Lipstik Matte Tahan Lama 24H", url: "https://shopee.co.id/product/9", image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&q=80", price: 35000, originalPrice: 89000, discountPercent: 61, rating: 4.7, reviewCount: 9821, soldCount: 28000, location: "Surabaya", category: "Beauty", isViral: false, marketplace: "shopee", affiliateUrl: "https://shope.ee/xyz9" },
  { title: "Air Fryer 5L Digital Touch", url: "https://shopee.co.id/product/10", image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&q=80", price: 599000, originalPrice: 1299000, discountPercent: 54, rating: 4.9, reviewCount: 6234, soldCount: 11000, location: "Jakarta", category: "Home", isViral: true, marketplace: "shopee", affiliateUrl: "https://shope.ee/xyz10" },
  { title: "Robot Vacuum Cleaner Smart", url: "https://shopee.co.id/product/11", image: "https://images.unsplash.com/photo-1605557202138-c7b51ad9c7f0?w=400&q=80", price: 899000, originalPrice: 1999000, discountPercent: 55, rating: 4.7, reviewCount: 3210, soldCount: 5400, location: "Tangerang", category: "Home", isViral: false, marketplace: "shopee", affiliateUrl: "https://shope.ee/xyz11" },
  { title: "Joystick Gamepad PS5 Wireless", url: "https://shopee.co.id/product/12", image: "https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=400&q=80", price: 299000, originalPrice: 599000, discountPercent: 50, rating: 4.8, reviewCount: 7421, soldCount: 14000, location: "Jakarta", category: "Gaming", isViral: true, marketplace: "shopee", affiliateUrl: "https://shope.ee/xyz12" },
];

(async () => {
  try {
    const existing = await p.shopeeProduct.count();
    if (existing > 0) {
      console.log(`Already ${existing} products in DB, skipping seed.`);
      return;
    }
    const result = await p.shopeeProduct.createMany({ data: products });
    console.log(`✓ Seeded ${result.count} sample products`);
    const verify = await p.shopeeProduct.count();
    console.log(`Total products now: ${verify}`);
  } catch (e) {
    console.error('ERR:', e.message);
    process.exit(1);
  } finally {
    await p.$disconnect();
  }
})();
