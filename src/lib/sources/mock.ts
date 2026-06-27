import type { Product } from "@/lib/types";
import {
  computeSoldPerDay,
  computeViralScore,
  VIRAL_SCORE_THRESHOLD,
} from "@/lib/viral-score";

interface MockTemplate {
  title: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  soldCount: number;
  daysAgo: number; // umur listing (hari)
  imageSeed: string; // seed untuk picsum
  viralHint?: boolean; // jika true, judul akan ditambahkan kata "Viral"
}

const TEMPLATES: Record<string, MockTemplate[]> = {
  elektronik: [
    { title: "Wireless Earbuds Pro Noise Cancelling TWS Viral TikTok", price: 189000, originalPrice: 399000, rating: 4.8, reviewCount: 12450, soldCount: 38000, daysAgo: 4, imageSeed: "earbuds", viralHint: true },
    { title: "Smartwatch S9 Ultra 2024 - Layar Always On AMOLED", price: 245000, originalPrice: 599000, rating: 4.7, reviewCount: 8721, soldCount: 22500, daysAgo: 6, imageSeed: "smartwatch", viralHint: true },
    { title: "Powerbank 20000mAh Fast Charging 22.5W PD QC", price: 135000, originalPrice: 249000, rating: 4.9, reviewCount: 18900, soldCount: 51000, daysAgo: 2, imageSeed: "powerbank" },
    { title: "Mini Projector LED HD Portable Bluetooth", price: 425000, originalPrice: 899000, rating: 4.6, reviewCount: 3210, soldCount: 4500, daysAgo: 9, imageSeed: "projector" },
    { title: "Mechanical Keyboard RGB Hot Swappable Wireless", price: 365000, originalPrice: 599000, rating: 4.8, reviewCount: 5610, soldCount: 8800, daysAgo: 3, imageSeed: "keyboard" },
    { title: "USB-C Hub 9 in 1 Docking Station HDMI 4K", price: 199000, originalPrice: 350000, rating: 4.7, reviewCount: 4200, soldCount: 6200, daysAgo: 7, imageSeed: "usbc-hub" },
    { title: "Bluetooth Speaker Bass Mini Waterproof IPX7", price: 145000, originalPrice: 289000, rating: 4.6, reviewCount: 7800, soldCount: 14500, daysAgo: 5, imageSeed: "speaker" },
    { title: "Ring Light LED 18 inch Tripod Stand TikTok", price: 165000, originalPrice: 320000, rating: 4.8, reviewCount: 11200, soldCount: 28400, daysAgo: 1, imageSeed: "ringlight", viralHint: true },
    { title: "Smart Doorbell WiFi Video Intercom Cloud Storage", price: 510000, originalPrice: 990000, rating: 4.5, reviewCount: 1450, soldCount: 1900, daysAgo: 12, imageSeed: "doorbell" },
    { title: "Charger Fast Charging 65W GaN USB-C Compact", price: 175000, originalPrice: 299000, rating: 4.8, reviewCount: 6700, soldCount: 11200, daysAgo: 4, imageSeed: "charger" },
  ],
  fashion: [
    { title: "Kaos Oversize Premium Cotton Combed 30s - Unisex Viral", price: 79000, originalPrice: 159000, rating: 4.8, reviewCount: 15400, soldCount: 42000, daysAgo: 2, imageSeed: "kaos", viralHint: true },
    { title: "Celana Cargo Pria Wanita Vintage Baggy Korean Style", price: 119000, originalPrice: 235000, rating: 4.7, reviewCount: 9200, soldCount: 18500, daysAgo: 5, imageSeed: "cargo", viralHint: true },
    { title: "Sepatu Sneakers Pria Wanita Casual Trend 2024", price: 199000, originalPrice: 450000, rating: 4.6, reviewCount: 12300, soldCount: 24800, daysAgo: 3, imageSeed: "sneakers" },
    { title: "Hoodie Polos Oversize Premium Fleece Tebal", price: 145000, originalPrice: 289000, rating: 4.9, reviewCount: 8700, soldCount: 16500, daysAgo: 6, imageSeed: "hoodie" },
    { title: "Tas Selempang Wanita Sling Bag Mini Korean", price: 89000, originalPrice: 179000, rating: 4.7, reviewCount: 6100, soldCount: 9200, daysAgo: 4, imageSeed: "tas-sling" },
    { title: "Jam Tangan Pria Sporty Anti Air LED Digital", price: 99000, originalPrice: 250000, rating: 4.5, reviewCount: 14500, soldCount: 31000, daysAgo: 1, imageSeed: "jam-tangan", viralHint: true },
    { title: "Dress Wanita Midi Vintage Korean Casual Summer", price: 135000, originalPrice: 265000, rating: 4.8, reviewCount: 5400, soldCount: 7800, daysAgo: 8, imageSeed: "dress" },
    { title: "Sandal Jepit Pria Wanita Slide Cloud Slippers", price: 49000, originalPrice: 99000, rating: 4.7, reviewCount: 21000, soldCount: 55000, daysAgo: 2, imageSeed: "sandal", viralHint: true },
    { title: "Topi Bucket Hat Pria Wanita UV Protection Korean", price: 59000, originalPrice: 119000, rating: 4.6, reviewCount: 4300, soldCount: 6700, daysAgo: 10, imageSeed: "bucket-hat" },
    { title: "Kacamata Hitam Pria Wanita Polarized UV400 Vintage", price: 65000, originalPrice: 145000, rating: 4.7, reviewCount: 8900, soldCount: 17800, daysAgo: 3, imageSeed: "kacamata" },
  ],
  beauty: [
    { title: "Serum Vitamin C Brightening Anti Aging 20% Viral", price: 89000, originalPrice: 199000, rating: 4.9, reviewCount: 28500, soldCount: 65000, daysAgo: 1, imageSeed: "serum-vc", viralHint: true },
    { title: "Sunscreen Gel SPF50 PA++++ Non Sticky TikTok Hot", price: 75000, originalPrice: 159000, rating: 4.8, reviewCount: 18700, soldCount: 42000, daysAgo: 3, imageSeed: "sunscreen", viralHint: true },
    { title: "Lip Tint Velvet Matte Long Lasting 24 Hours", price: 55000, originalPrice: 119000, rating: 4.7, reviewCount: 14300, soldCount: 33500, daysAgo: 2, imageSeed: "lip-tint" },
    { title: "Foundation Cushion Compact Matte Finish Korean", price: 99000, originalPrice: 199000, rating: 4.6, reviewCount: 9200, soldCount: 18500, daysAgo: 5, imageSeed: "cushion" },
    { title: "Micellar Water 500ml Gentle Deep Cleansing", price: 69000, originalPrice: 129000, rating: 4.8, reviewCount: 16700, soldCount: 38000, daysAgo: 4, imageSeed: "micellar" },
    { title: "Hair Tonic Penumbuh Rambat Anti Rontok Alami", price: 79000, originalPrice: 159000, rating: 4.5, reviewCount: 11200, soldCount: 21500, daysAgo: 7, imageSeed: "hair-tonic" },
    { title: "Body Scrub Whitening Glutathione Premium 500g", price: 89000, originalPrice: 189000, rating: 4.7, reviewCount: 7800, soldCount: 13200, daysAgo: 6, imageSeed: "body-scrub" },
    { title: "Eye Cream Anti Dark Circle Peptides Caffeine", price: 109000, originalPrice: 225000, rating: 4.6, reviewCount: 4500, soldCount: 6700, daysAgo: 9, imageSeed: "eye-cream" },
    { title: "Parfum Long Lasting Eau De Parfum 50ml Premium", price: 129000, originalPrice: 299000, rating: 4.8, reviewCount: 13200, soldCount: 26800, daysAgo: 2, imageSeed: "parfum", viralHint: true },
    { title: "Masker Spiral Wajah Vitamin C Whitening 10pcs", price: 39000, originalPrice: 89000, rating: 4.7, reviewCount: 18900, soldCount: 41000, daysAgo: 4, imageSeed: "masker" },
  ],
  home: [
    { title: "Air Fryer 5L Digital Touch Screen Healthy Cooking", price: 489000, originalPrice: 899000, rating: 4.8, reviewCount: 8700, soldCount: 14500, daysAgo: 3, imageSeed: "air-fryer" },
    { title: "Slow Juicer Masticating Cold Press Anti Oksidasi", price: 799000, originalPrice: 1599000, rating: 4.7, reviewCount: 3200, soldCount: 4500, daysAgo: 8, imageSeed: "juicer" },
    { title: "Vacuum Cleaner Wireless Portable Powerful Suction", price: 599000, originalPrice: 1299000, rating: 4.6, reviewCount: 5600, soldCount: 8900, daysAgo: 5, imageSeed: "vacuum" },
    { title: "Lampu Tidur LED Smart RGB Remote Control Aura", price: 89000, originalPrice: 179000, rating: 4.8, reviewCount: 14500, soldCount: 32000, daysAgo: 2, imageSeed: "lampu-tidur", viralHint: true },
    { title: "Rak Pakaian Susun Stainless Steel 4 Tingkat Roda", price: 199000, originalPrice: 399000, rating: 4.7, reviewCount: 7800, soldCount: 13400, daysAgo: 4, imageSeed: "rak-pakaian" },
    { title: "Set Perkakas Dapur 18 pcs Stainless Steel Premium", price: 245000, originalPrice: 499000, rating: 4.7, reviewCount: 6700, soldCount: 11200, daysAgo: 6, imageSeed: "perkakas-dapur" },
    { title: "Diffuser Aromaterapi Ultrasonic Humidifier LED", price: 119000, originalPrice: 245000, rating: 4.8, reviewCount: 11200, soldCount: 23800, daysAgo: 3, imageSeed: "diffuser", viralHint: true },
    { title: "Karpet Anti Slip Lembut Bedroom 80x160cm", price: 99000, originalPrice: 199000, rating: 4.6, reviewCount: 9400, soldCount: 18900, daysAgo: 5, imageSeed: "karpet" },
    { title: "Gorden Blackout Magnetic Blind Anti Panas", price: 145000, originalPrice: 299000, rating: 4.5, reviewCount: 3200, soldCount: 4500, daysAgo: 9, imageSeed: "gorden" },
    { title: "Dispenser Galon Bawah Bottom Load Electric Hot Cool", price: 599000, originalPrice: 1199000, rating: 4.7, reviewCount: 2800, soldCount: 3900, daysAgo: 11, imageSeed: "dispenser" },
  ],
  gaming: [
    { title: "Gaming Mouse RGB 12000 DPI Programmable Macro Viral", price: 159000, originalPrice: 349000, rating: 4.8, reviewCount: 12300, soldCount: 24500, daysAgo: 3, imageSeed: "gaming-mouse", viralHint: true },
    { title: "Gaming Headset 7.1 Surround Sound Mic Noise Cancel", price: 245000, originalPrice: 499000, rating: 4.7, reviewCount: 8900, soldCount: 16700, daysAgo: 4, imageSeed: "gaming-headset" },
    { title: "Mousepad XL Extended RGB Edge Lighting 800x300mm", price: 99000, originalPrice: 199000, rating: 4.8, reviewCount: 14500, soldCount: 31000, daysAgo: 2, imageSeed: "mousepad" },
    { title: "Controller Gamepad Wireless Bluetooth Vibrasi", price: 199000, originalPrice: 449000, rating: 4.6, reviewCount: 7800, soldCount: 13200, daysAgo: 5, imageSeed: "controller" },
    { title: "Gaming Chair Ergonomic Footrest Reclining 180", price: 1299000, originalPrice: 2499000, rating: 4.7, reviewCount: 2100, soldCount: 3400, daysAgo: 7, imageSeed: "gaming-chair" },
    { title: "Capture Card 4K HDMI USB 3.0 Streaming OBS", price: 425000, originalPrice: 899000, rating: 4.5, reviewCount: 1800, soldCount: 2600, daysAgo: 9, imageSeed: "capture-card" },
    { title: "Gaming Desk Mechanical Keyboard Tray Cup Holder", price: 899000, originalPrice: 1599000, rating: 4.6, reviewCount: 1400, soldCount: 1900, daysAgo: 10, imageSeed: "gaming-desk" },
    { title: "Cooling Pad Laptop 5 Fan RGB Adjustable Stand", price: 145000, originalPrice: 299000, rating: 4.7, reviewCount: 6700, soldCount: 12400, daysAgo: 4, imageSeed: "cooling-pad" },
    { title: "Streaming Mic USB Condenser Cardioid Boom Arm Set", price: 365000, originalPrice: 749000, rating: 4.8, reviewCount: 4500, soldCount: 7800, daysAgo: 6, imageSeed: "streaming-mic" },
    { title: "Handheld Console Game 4.3 inch Retro 10000+ Games", price: 299000, originalPrice: 599000, rating: 4.6, reviewCount: 8800, soldCount: 17500, daysAgo: 2, imageSeed: "handheld-console", viralHint: true },
  ],
  olahraga: [
    { title: "Treadmill Lipat Electric Home Use Incline Viral", price: 2999000, originalPrice: 5999000, rating: 4.7, reviewCount: 3400, soldCount: 5800, daysAgo: 6, imageSeed: "treadmill" },
    { title: "Dumbbell Set Adjustable 20kg Pair Rubber Coated", price: 549000, originalPrice: 999000, rating: 4.8, reviewCount: 5600, soldCount: 9200, daysAgo: 4, imageSeed: "dumbbell" },
    { title: "Matras Yoga Anti Slip 6mm TPE Eco Friendly Carrier", price: 99000, originalPrice: 199000, rating: 4.8, reviewCount: 12300, soldCount: 26800, daysAgo: 3, imageSeed: "matras-yoga", viralHint: true },
    { title: "Resistance Band Set 5 pcs Gym Fitness Training", price: 79000, originalPrice: 179000, rating: 4.7, reviewCount: 15600, soldCount: 35000, daysAgo: 2, imageSeed: "resistance-band", viralHint: true },
    { title: "Sepatu Lari Pria Wanita Lightweight Breathable", price: 249000, originalPrice: 499000, rating: 4.6, reviewCount: 9800, soldCount: 17800, daysAgo: 5, imageSeed: "sepatu-lari" },
    { title: "Skipping Rope Counter Digital Bearing Speed", price: 49000, originalPrice: 99000, rating: 4.7, reviewCount: 18700, soldCount: 39000, daysAgo: 1, imageSeed: "skipping", viralHint: true },
    { title: "Push Up Bar Rotating Steel Grip Strength Trainer", price: 69000, originalPrice: 149000, rating: 4.5, reviewCount: 7200, soldCount: 12800, daysAgo: 6, imageSeed: "pushup-bar" },
    { title: "Smart Bottle Water 1L Hydration Reminder LED Display", price: 119000, originalPrice: 245000, rating: 4.6, reviewCount: 4300, soldCount: 7100, daysAgo: 7, imageSeed: "smart-bottle" },
    { title: "Kettlebell Cast Iron 12kg Vinyl Coated Grip", price: 299000, originalPrice: 549000, rating: 4.7, reviewCount: 2100, soldCount: 3400, daysAgo: 9, imageSeed: "kettlebell" },
    { title: "Forearm Blaster Wrist Curl Strength Builder", price: 89000, originalPrice: 199000, rating: 4.5, reviewCount: 5400, soldCount: 8900, daysAgo: 4, imageSeed: "forearm" },
  ],
  mainan: [
    { title: "Boneka Jumbo 1 Meter Beruang Bulu Lembut Viral", price: 159000, originalPrice: 349000, rating: 4.9, reviewCount: 14500, soldCount: 32000, daysAgo: 2, imageSeed: "boneka-jumbo", viralHint: true },
    { title: "Action Figure Anime 15cm Articulated Collectible", price: 199000, originalPrice: 425000, rating: 4.7, reviewCount: 3400, soldCount: 5200, daysAgo: 5, imageSeed: "action-figure" },
    { title: "Puzzle 1000 pcs Landscape Premium Quality Jigsaw", price: 99000, originalPrice: 199000, rating: 4.8, reviewCount: 5600, soldCount: 9400, daysAgo: 4, imageSeed: "puzzle" },
    { title: "RC Car Drift 4WD High Speed Remote Control Off Road", price: 329000, originalPrice: 649000, rating: 4.6, reviewCount: 4200, soldCount: 6800, daysAgo: 3, imageSeed: "rc-car" },
    { title: "Lego Compatible Bricks City Building 1500 pcs", price: 245000, originalPrice: 499000, rating: 4.7, reviewCount: 6700, soldCount: 11400, daysAgo: 6, imageSeed: "bricks" },
    { title: "Board Game Catan Strategy Family 3-4 Players", price: 299000, originalPrice: 549000, rating: 4.8, reviewCount: 2800, soldCount: 4200, daysAgo: 8, imageSeed: "board-game" },
    { title: "Slime Set DIY Kit Glitter Foam Beads Stress Relief", price: 59000, originalPrice: 129000, rating: 4.6, reviewCount: 9800, soldCount: 18900, daysAgo: 3, imageSeed: "slime", viralHint: true },
    { title: "Toy Gun Foam Blaster Darts 30 pcs Target Set", price: 189000, originalPrice: 379000, rating: 4.7, reviewCount: 4500, soldCount: 7300, daysAgo: 5, imageSeed: "toy-gun" },
    { title: "Stuffed Animal Mini Keychain Plush 10 pcs", price: 49000, originalPrice: 99000, rating: 4.5, reviewCount: 12300, soldCount: 24500, daysAgo: 1, imageSeed: "mini-plush" },
    { title: "Magic Cube Speed Cube 3x3 Stickerless Pro", price: 69000, originalPrice: 149000, rating: 4.8, reviewCount: 15600, soldCount: 34500, daysAgo: 2, imageSeed: "rubik", viralHint: true },
  ],
  otomotif: [
    { title: "Dashcam WiFi 4K Dual Lens Night Vision Viral", price: 599000, originalPrice: 1299000, rating: 4.7, reviewCount: 4500, soldCount: 7200, daysAgo: 4, imageSeed: "dashcam", viralHint: true },
    { title: "Car Vacuum Cleaner Wireless Powerful Handheld", price: 199000, originalPrice: 425000, rating: 4.6, reviewCount: 8900, soldCount: 15400, daysAgo: 3, imageSeed: "car-vacuum" },
    { title: "Cover Mobil Anti Air UV Full Size Premium Tahan Lama", price: 299000, originalPrice: 599000, rating: 4.7, reviewCount: 6700, soldCount: 11200, daysAgo: 5, imageSeed: "cover-mobil" },
    { title: "Phone Holder Car Dashboard 360 Suction Cup Magnetic", price: 89000, originalPrice: 199000, rating: 4.8, reviewCount: 14500, soldCount: 32000, daysAgo: 2, imageSeed: "phone-holder", viralHint: true },
    { title: "LED Strip Interior Mobil RGB Music Sync Remote", price: 99000, originalPrice: 225000, rating: 4.7, reviewCount: 8400, soldCount: 17800, daysAgo: 3, imageSeed: "led-mobil" },
    { title: "Tire Inflator Portable Electric 12V Digital Display", price: 289000, originalPrice: 599000, rating: 4.6, reviewCount: 5600, soldCount: 9400, daysAgo: 6, imageSeed: "inflator" },
    { title: "Helm Full Face Double Visor Standard SNI Premium", price: 365000, originalPrice: 699000, rating: 4.7, reviewCount: 7200, soldCount: 12800, daysAgo: 4, imageSeed: "helm" },
    { title: "Car Charger Fast Charging 54W Dual USB PD QC", price: 79000, originalPrice: 169000, rating: 4.8, reviewCount: 11200, soldCount: 24500, daysAgo: 2, imageSeed: "car-charger" },
    { title: "Wiper Blade Silicone Frameless Silent Clean Streak", price: 89000, originalPrice: 199000, rating: 4.6, reviewCount: 4500, soldCount: 7100, daysAgo: 7, imageSeed: "wiper" },
    { title: "Motorcycle Cover Waterproof Dustproof UV Protection", price: 119000, originalPrice: 249000, rating: 4.5, reviewCount: 3200, soldCount: 4900, daysAgo: 8, imageSeed: "cover-motor" },
  ],
};

/**
 * Generate produk mock untuk kategori tertentu.
 * @param categoryId slug kategori (lowercase, mis. "elektronik")
 * @param categoryName nama kategori untuk display
 * @param count berapa produk yang ingin dihasilkan
 */
export function generateMockProducts(
  categoryId: string,
  categoryName: string,
  count = 12
): Product[] {
  const slug = categoryId.toLowerCase().trim();
  const templates = TEMPLATES[slug] ?? TEMPLATES.elektronik;
  const results: Product[] = [];

  for (let i = 0; i < count; i++) {
    const tpl = templates[i % templates.length];
    // Variasi supaya tidak semua duplikat kalau count > templates
    const variantSuffix = i >= templates.length ? ` #${Math.floor(i / templates.length) + 1}` : "";
    const title = tpl.title + variantSuffix;
    const timestamp = new Date(Date.now() - tpl.daysAgo * 24 * 60 * 60 * 1000).toISOString();
    const soldPerDay = computeSoldPerDay(tpl.soldCount, timestamp);
    const discountPercent = tpl.originalPrice
      ? Math.round(((tpl.originalPrice - tpl.price) / tpl.originalPrice) * 100)
      : undefined;

    const viralScore = computeViralScore({
      soldPerDay,
      rating: tpl.rating,
      reviewCount: tpl.reviewCount,
      timestamp,
      price: tpl.price,
      originalPrice: tpl.originalPrice,
      title,
    });

    const id = `mock-${slug}-${i}-${Math.abs(hashString(title))}`;

    results.push({
      id,
      title,
      url: `https://picsum.photos/seed/${tpl.imageSeed}/400/400`,
      image: `https://picsum.photos/seed/${tpl.imageSeed}-${i % 5}/400/400`,
      price: tpl.price,
      originalPrice: tpl.originalPrice,
      discountPercent,
      rating: tpl.rating,
      reviewCount: tpl.reviewCount,
      soldCount: tpl.soldCount,
      soldPerDay: Math.round(soldPerDay * 10) / 10,
      timestamp,
      marketplace: "mock",
      category: categoryName,
      viralScore: Math.round(viralScore * 100) / 100,
      isViral: viralScore >= VIRAL_SCORE_THRESHOLD,
    });
  }

  return results;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/**
 * Cek apakah RAPIDAPI_KEY di-set.
 */
export function hasRapidApiKey(): boolean {
  return Boolean(process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_KEY.trim().length > 0);
}
