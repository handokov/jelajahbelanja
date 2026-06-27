import type { Product, Marketplace } from "@/lib/types";
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
  daysAgo: number;
  imageSeed: string;
  viralHint?: boolean;
  marketplace: Marketplace;
  marketplaceUrl: string; // URL asli produk di marketplace
  location?: string;
}

/**
 * Format URL produk Shopee: https://shopee.co.id/<slug>-i.<shop>.<product>
 * Format URL produk Tokopedia: https://www.tokopedia.com/<shop>/<slug>
 * Format URL produk Lazada: https://www.lazada.co.id/products/<slug>-i<shop>-s<product>
 *
 * URL di bawah adalah URL realistis (slug + ID) tapi bukan link live.
 * Saat user klik, mereka tetap diarahkan ke halaman pencarian marketplace.
 */
const shopeeUrl = (slug: string, shopId: string, productId: string) =>
  `https://shopee.co.id/${slug}-i.${shopId}.${productId}`;
const tokopediaUrl = (shop: string, slug: string) =>
  `https://www.tokopedia.com/${shop}/${slug}`;
const lazadaUrl = (slug: string, shopId: number, productId: number) =>
  `https://www.lazada.co.id/products/${slug}-i${shopId}-s${productId}.html`;

const TEMPLATES: Record<string, MockTemplate[]> = {
  elektronik: [
    { title: "Earbuds TWS Pro Noise Cancelling Viral TikTok - Garansi Resmi", price: 89000, originalPrice: 250000, rating: 4.9, reviewCount: 28500, soldCount: 75000, daysAgo: 2, imageSeed: "earbuds-tws", viralHint: true, marketplace: "shopee", marketplaceUrl: shopeeUrl("earbuds-tws-pro-noise-cancelling", "3388016", "1658084736"), location: "Jakarta Barat" },
    { title: "Smartwatch S9 Ultra 2024 Layar AMOLED Always On - Waterproof", price: 145000, originalPrice: 399000, rating: 4.8, reviewCount: 12450, soldCount: 32000, daysAgo: 3, imageSeed: "smartwatch-s9", viralHint: true, marketplace: "shopee", marketplaceUrl: shopeeUrl("smartwatch-s9-ultra-amoled", "3388016", "1892453617"), location: "Jakarta Barat" },
    { title: "Powerbank 20000mAh Fast Charging 22.5W PD Original", price: 135000, originalPrice: 249000, rating: 4.9, reviewCount: 18900, soldCount: 51000, daysAgo: 1, imageSeed: "powerbank-20000", marketplace: "tokopedia", marketplaceUrl: tokopediaUrl("gadget-store", "powerbank-20000mah-fast-charging"), location: "Bandung" },
    { title: "Mini Projector LED HD Portable Bluetooth Home Theater", price: 425000, originalPrice: 899000, rating: 4.6, reviewCount: 3210, soldCount: 4500, daysAgo: 9, imageSeed: "projector-mini", marketplace: "lazada", marketplaceUrl: lazadaUrl("mini-projector-led-hd-portable", 2, 5801234), location: "Surabaya" },
    { title: "Keyboard Mechanical RGB Hot Swappable Wireless Bluetooth", price: 365000, originalPrice: 599000, rating: 4.8, reviewCount: 5610, soldCount: 8800, daysAgo: 4, imageSeed: "keyboard-mechanical", marketplace: "shopee", marketplaceUrl: shopeeUrl("keyboard-mechanical-rgb-hotswap", "5589921", "2034567891"), location: "Tangerang" },
    { title: "USB C Hub 9 in 1 Docking Station HDMI 4K Type C", price: 199000, originalPrice: 350000, rating: 4.7, reviewCount: 4200, soldCount: 6200, daysAgo: 7, imageSeed: "usbc-hub-9in1", marketplace: "tokopedia", marketplaceUrl: tokopediaUrl("tech-shop", "usb-c-hub-9-in-1-docking"), location: "Jakarta Pusat" },
    { title: "Speaker Bluetooth Bass Mini Waterproof IPX7 Portable", price: 145000, originalPrice: 289000, rating: 4.6, reviewCount: 7800, soldCount: 14500, daysAgo: 5, imageSeed: "speaker-bluetooth", marketplace: "shopee", marketplaceUrl: shopeeUrl("speaker-bluetooth-bass-waterproof", "7742391", "1456789012"), location: "Bekasi" },
    { title: "Ring Light 18 inch LED Tripod Stand TikTok Shopee Live", price: 165000, originalPrice: 320000, rating: 4.8, reviewCount: 11200, soldCount: 28400, daysAgo: 1, imageSeed: "ring-light-18", viralHint: true, marketplace: "shopee", marketplaceUrl: shopeeUrl("ring-light-18-inch-tripod-tiktok", "7742391", "1690234567"), location: "Bekasi" },
    { title: "Charger Fast Charging 65W GaN USB C Compact - PD QC", price: 175000, originalPrice: 299000, rating: 4.8, reviewCount: 6700, soldCount: 11200, daysAgo: 4, imageSeed: "charger-65w-gan", marketplace: "lazada", marketplaceUrl: lazadaUrl("charger-fast-charging-65w-gan", 3, 8945612), location: "Jakarta Selatan" },
    { title: "Headset Gaming 7.1 Surround Sound Mic Noise Cancel RGB", price: 245000, originalPrice: 499000, rating: 4.7, reviewCount: 8900, soldCount: 16700, daysAgo: 6, imageSeed: "headset-gaming-71", marketplace: "tokopedia", marketplaceUrl: tokopediaUrl("gaming-corner", "headset-gaming-71-surround"), location: "Yogyakarta" },
  ],
  fashion: [
    { title: "Kaos Oversize Premium Cotton Combed 30s Unisex Viral", price: 79000, originalPrice: 159000, rating: 4.8, reviewCount: 15400, soldCount: 42000, daysAgo: 2, imageSeed: "kaos-oversize", viralHint: true, marketplace: "shopee", marketplaceUrl: shopeeUrl("kaos-oversize-cotton-combed-30s", "9123456", "7788990011"), location: "Bandung" },
    { title: "Celana Cargo Pria Wanita Vintage Baggy Korean Style", price: 119000, originalPrice: 235000, rating: 4.7, reviewCount: 9200, soldCount: 18500, daysAgo: 5, imageSeed: "celana-cargo", viralHint: true, marketplace: "shopee", marketplaceUrl: shopeeUrl("celana-cargo-vintage-baggy-korean", "9123456", "8899001122"), location: "Bandung" },
    { title: "Sepatu Sneakers Pria Wanita Casual Trend 2024 Original", price: 199000, originalPrice: 450000, rating: 4.6, reviewCount: 12300, soldCount: 24800, daysAgo: 3, imageSeed: "sneakers-trend", marketplace: "tokopedia", marketplaceUrl: tokopediaUrl("sneaker-hub", "sepatu-sneakers-casual-trend"), location: "Jakarta Barat" },
    { title: "Hoodie Polos Oversize Premium Fleece Tebal Korean", price: 145000, originalPrice: 289000, rating: 4.9, reviewCount: 8700, soldCount: 16500, daysAgo: 6, imageSeed: "hoodie-oversize", marketplace: "shopee", marketplaceUrl: shopeeUrl("hoodie-polos-oversize-fleece", "9123456", "9911223344"), location: "Bandung" },
    { title: "Tas Selempang Wanita Sling Bag Mini Korean Trend", price: 89000, originalPrice: 179000, rating: 4.7, reviewCount: 6100, soldCount: 9200, daysAgo: 4, imageSeed: "tas-selempang", marketplace: "lazada", marketplaceUrl: lazadaUrl("tas-selempang-wanita-sling-mini", 4, 7123456), location: "Tangerang" },
    { title: "Jam Tangan Pria Sporty Anti Air LED Digital - Garansi", price: 99000, originalPrice: 250000, rating: 4.5, reviewCount: 14500, soldCount: 31000, daysAgo: 1, imageSeed: "jam-tangan-led", viralHint: true, marketplace: "shopee", marketplaceUrl: shopeeUrl("jam-tangan-pria-sporty-led", "3388016", "6677889900"), location: "Jakarta Barat" },
    { title: "Dress Wanita Midi Vintage Korean Casual Summer - Ready", price: 135000, originalPrice: 265000, rating: 4.8, reviewCount: 5400, soldCount: 7800, daysAgo: 8, imageSeed: "dress-midi", marketplace: "tokopedia", marketplaceUrl: tokopediaUrl("fashion-room", "dress-wanita-midi-vintage-korean"), location: "Bandung" },
    { title: "Sandal Jepit Pria Wanita Slide Cloud Slippers Anti Slip", price: 49000, originalPrice: 99000, rating: 4.7, reviewCount: 21000, soldCount: 55000, daysAgo: 2, imageSeed: "sandal-slide", viralHint: true, marketplace: "shopee", marketplaceUrl: shopeeUrl("sandal-slide-cloud-slippers", "1234567", "4455667788"), location: "Bekasi" },
    { title: "Topi Bucket Hat Pria Wanita UV Protection Korean Style", price: 59000, originalPrice: 119000, rating: 4.6, reviewCount: 4300, soldCount: 6700, daysAgo: 10, imageSeed: "bucket-hat", marketplace: "shopee", marketplaceUrl: shopeeUrl("topi-bucket-hat-uv-protection", "1234567", "5566778899"), location: "Bekasi" },
    { title: "Kacamata Hitam Pria Wanita Polarized UV400 Vintage", price: 65000, originalPrice: 145000, rating: 4.7, reviewCount: 8900, soldCount: 17800, daysAgo: 3, imageSeed: "kacamata-hitam", marketplace: "lazada", marketplaceUrl: lazadaUrl("kacamata-hitam-polarized-uv400", 5, 6234567), location: "Jakarta Pusat" },
  ],
  beauty: [
    { title: "Serum Vitamin C Brightening Anti Aging 20% Original BPOM", price: 89000, originalPrice: 199000, rating: 4.9, reviewCount: 28500, soldCount: 65000, daysAgo: 1, imageSeed: "serum-vitc", viralHint: true, marketplace: "shopee", marketplaceUrl: shopeeUrl("serum-vitamin-c-brightening-20-bpom", "4567890", "1234123412"), location: "Jakarta Selatan" },
    { title: "Sunscreen Gel SPF50 PA++++ Non Sticky TikTok Hot", price: 75000, originalPrice: 159000, rating: 4.8, reviewCount: 18700, soldCount: 42000, daysAgo: 3, imageSeed: "sunscreen-gel", viralHint: true, marketplace: "shopee", marketplaceUrl: shopeeUrl("sunscreen-gel-spf50-pa-non-sticky", "4567890", "2345234523"), location: "Jakarta Selatan" },
    { title: "Lip Tint Velvet Matte Long Lasting 24 Hours - BPOM", price: 55000, originalPrice: 119000, rating: 4.7, reviewCount: 14300, soldCount: 33500, daysAgo: 2, imageSeed: "lip-tint-velvet", marketplace: "tokopedia", marketplaceUrl: tokopediaUrl("beauty-corner", "lip-tint-velvet-matte-long-lasting"), location: "Bandung" },
    { title: "Foundation Cushion Compact Matte Finish Korean Original", price: 99000, originalPrice: 199000, rating: 4.6, reviewCount: 9200, soldCount: 18500, daysAgo: 5, imageSeed: "cushion-foundation", marketplace: "lazada", marketplaceUrl: lazadaUrl("foundation-cushion-matte-korean", 6, 5345612), location: "Surabaya" },
    { title: "Micellar Water 500ml Gentle Deep Cleansing Wajah", price: 69000, originalPrice: 129000, rating: 4.8, reviewCount: 16700, soldCount: 38000, daysAgo: 4, imageSeed: "micellar-water", marketplace: "shopee", marketplaceUrl: shopeeUrl("micellar-water-500ml-gentle-cleansing", "4567890", "3456345634"), location: "Jakarta Selatan" },
    { title: "Hair Tonic Penumbuh Rambat Anti Rontok Alami - 100ml", price: 79000, originalPrice: 159000, rating: 4.5, reviewCount: 11200, soldCount: 21500, daysAgo: 7, imageSeed: "hair-tonic", marketplace: "tokopedia", marketplaceUrl: tokopediaUrl("herbal-shop", "hair-tonic-penumbuh-anti-rontok"), location: "Semarang" },
    { title: "Body Scrub Whitening Glutathione Premium 500g - BPOM", price: 89000, originalPrice: 189000, rating: 4.7, reviewCount: 7800, soldCount: 13200, daysAgo: 6, imageSeed: "body-scrub", marketplace: "shopee", marketplaceUrl: shopeeUrl("body-scrub-whitening-glutathione", "4567890", "4567456745"), location: "Jakarta Selatan" },
    { title: "Eye Cream Anti Dark Circle Peptides Caffeine - BPOM", price: 109000, originalPrice: 225000, rating: 4.6, reviewCount: 4500, soldCount: 6700, daysAgo: 9, imageSeed: "eye-cream", marketplace: "lazada", marketplaceUrl: lazadaUrl("eye-cream-anti-dark-circle-peptides", 7, 4456712), location: "Jakarta Pusat" },
    { title: "Parfum Long Lasting Eau De Parfum 50ml Premium Original", price: 129000, originalPrice: 299000, rating: 4.8, reviewCount: 13200, soldCount: 26800, daysAgo: 2, imageSeed: "parfum-edp", viralHint: true, marketplace: "shopee", marketplaceUrl: shopeeUrl("parfum-long-lasting-edp-50ml-premium", "4567890", "5678567856"), location: "Jakarta Selatan" },
    { title: "Masker Spiral Wajah Vitamin C Whitening 10pcs - BPOM", price: 39000, originalPrice: 89000, rating: 4.7, reviewCount: 18900, soldCount: 41000, daysAgo: 4, imageSeed: "masker-vitc", marketplace: "tokopedia", marketplaceUrl: tokopediaUrl("skincare-id", "masker-spiral-vitamin-c-whitening"), location: "Bandung" },
  ],
  home: [
    { title: "Air Fryer 5L Digital Touch Screen Healthy Cooking - Garansi", price: 489000, originalPrice: 899000, rating: 4.8, reviewCount: 8700, soldCount: 14500, daysAgo: 3, imageSeed: "air-fryer-5l", marketplace: "shopee", marketplaceUrl: shopeeUrl("air-fryer-5l-digital-touch-screen", "2233445", "9012901290"), location: "Jakarta Barat" },
    { title: "Slow Juicer Masticating Cold Press Anti Oksidasi - 1 tahun", price: 799000, originalPrice: 1599000, rating: 4.7, reviewCount: 3200, soldCount: 4500, daysAgo: 8, imageSeed: "slow-juicer", marketplace: "tokopedia", marketplaceUrl: tokopediaUrl("kitchen-pro", "slow-juicer-masticating-cold-press"), location: "Jakarta Pusat" },
    { title: "Vacuum Cleaner Wireless Portable Powerful Suction - 6000Pa", price: 599000, originalPrice: 1299000, rating: 4.6, reviewCount: 5600, soldCount: 8900, daysAgo: 5, imageSeed: "vacuum-cleaner", marketplace: "lazada", marketplaceUrl: lazadaUrl("vacuum-cleaner-wireless-portable", 8, 3567812), location: "Tangerang" },
    { title: "Lampu Tidur LED Smart RGB Remote Control Aura - 16 juta warna", price: 89000, originalPrice: 179000, rating: 4.8, reviewCount: 14500, soldCount: 32000, daysAgo: 2, imageSeed: "lampu-tidur-rgb", viralHint: true, marketplace: "shopee", marketplaceUrl: shopeeUrl("lampu-tidur-led-rgb-remote-aura", "2233445", "0123010123"), location: "Jakarta Barat" },
    { title: "Rak Pakaian Susun Stainless Steel 4 Tingkat Roda - 40kg", price: 199000, originalPrice: 399000, rating: 4.7, reviewCount: 7800, soldCount: 13400, daysAgo: 4, imageSeed: "rak-pakaian", marketplace: "tokopedia", marketplaceUrl: tokopediaUrl("home-living", "rak-pakaian-stainless-4-tingkat"), location: "Surabaya" },
    { title: "Set Perkakas Dapur 18 pcs Stainless Steel Premium - Berkado", price: 245000, originalPrice: 499000, rating: 4.7, reviewCount: 6700, soldCount: 11200, daysAgo: 6, imageSeed: "perkakas-dapur", marketplace: "shopee", marketplaceUrl: shopeeUrl("set-perkakas-dapur-18-pcs-stainless", "2233445", "1234123499"), location: "Jakarta Barat" },
    { title: "Diffuser Aromaterapi Ultrasonic Humidifier LED - 300ml", price: 119000, originalPrice: 245000, rating: 4.8, reviewCount: 11200, soldCount: 23800, daysAgo: 3, imageSeed: "diffuser-aroma", viralHint: true, marketplace: "shopee", marketplaceUrl: shopeeUrl("diffuser-aromaterapi-ultrasonic-led", "2233445", "2345234599"), location: "Jakarta Barat" },
    { title: "Karpet Anti Slip Lembut Bedroom 80x160cm - Premium", price: 99000, originalPrice: 199000, rating: 4.6, reviewCount: 9400, soldCount: 18900, daysAgo: 5, imageSeed: "karpet-anti-slip", marketplace: "tokopedia", marketplaceUrl: tokopediaUrl("home-decor", "karpet-anti-slip-bedroom-80x160"), location: "Bandung" },
    { title: "Gorden Blackout Magnetic Blind Anti Panas UV - Siap Potong", price: 145000, originalPrice: 299000, rating: 4.5, reviewCount: 3200, soldCount: 4500, daysAgo: 9, imageSeed: "gorden-blackout", marketplace: "lazada", marketplaceUrl: lazadaUrl("gorden-blackout-magnetic-anti-panas", 9, 2678123), location: "Jakarta Selatan" },
    { title: "Dispenser Galon Bawah Bottom Load Electric Hot Cool", price: 599000, originalPrice: 1199000, rating: 4.7, reviewCount: 2800, soldCount: 3900, daysAgo: 11, imageSeed: "dispenser-galon", marketplace: "shopee", marketplaceUrl: shopeeUrl("dispenser-galon-bawah-bottom-load-electric", "2233445", "3456345699"), location: "Jakarta Barat" },
  ],
  gaming: [
    { title: "Mouse Gaming RGB 12000 DPI Programmable Macro - Rekomendasi", price: 159000, originalPrice: 349000, rating: 4.8, reviewCount: 12300, soldCount: 24500, daysAgo: 3, imageSeed: "mouse-gaming-rgb", viralHint: true, marketplace: "shopee", marketplaceUrl: shopeeUrl("mouse-gaming-rgb-12000-dpi-macro", "9988776", "6789678967"), location: "Jakarta Pusat" },
    { title: "Headset Gaming 7.1 Surround Sound Mic Noise Cancel RGB", price: 245000, originalPrice: 499000, rating: 4.7, reviewCount: 8900, soldCount: 16700, daysAgo: 4, imageSeed: "headset-gaming-71", marketplace: "tokopedia", marketplaceUrl: tokopediaUrl("gaming-corner", "headset-gaming-71-surround-rgb"), location: "Yogyakarta" },
    { title: "Mousepad XL Extended RGB Edge Lighting 800x300mm - Anti Slip", price: 99000, originalPrice: 199000, rating: 4.8, reviewCount: 14500, soldCount: 31000, daysAgo: 2, imageSeed: "mousepad-xl-rgb", marketplace: "shopee", marketplaceUrl: shopeeUrl("mousepad-xl-extended-rgb-800x300", "9988776", "7890789078"), location: "Jakarta Pusat" },
    { title: "Controller Gamepad Wireless Bluetooth Vibrasi PC Android", price: 199000, originalPrice: 449000, rating: 4.6, reviewCount: 7800, soldCount: 13200, daysAgo: 5, imageSeed: "controller-wireless", marketplace: "lazada", marketplaceUrl: lazadaUrl("controller-gamepad-wireless-bluetooth", 10, 1678923), location: "Jakarta Selatan" },
    { title: "Gaming Chair Ergonomic Footrest Reclining 180 - 1 tahun", price: 1299000, originalPrice: 2499000, rating: 4.7, reviewCount: 2100, soldCount: 3400, daysAgo: 7, imageSeed: "gaming-chair", marketplace: "tokopedia", marketplaceUrl: tokopediaUrl("gaming-corner", "gaming-chair-ergonomic-footrest-reclining"), location: "Surabaya" },
    { title: "Capture Card 4K HDMI USB 3.0 Streaming OBS - Plug Play", price: 425000, originalPrice: 899000, rating: 4.5, reviewCount: 1800, soldCount: 2600, daysAgo: 9, imageSeed: "capture-card-4k", marketplace: "shopee", marketplaceUrl: shopeeUrl("capture-card-4k-hdmi-usb-streaming", "9988776", "8901890189"), location: "Jakarta Pusat" },
    { title: "Cooling Pad Laptop 5 Fan RGB Adjustable Stand - Universal", price: 145000, originalPrice: 299000, rating: 4.7, reviewCount: 6700, soldCount: 12400, daysAgo: 4, imageSeed: "cooling-pad-5fan", marketplace: "shopee", marketplaceUrl: shopeeUrl("cooling-pad-laptop-5-fan-rgb-stand", "9988776", "9012901290"), location: "Jakarta Pusat" },
    { title: "Streaming Mic USB Condenser Cardioid Boom Arm Set", price: 365000, originalPrice: 749000, rating: 4.8, reviewCount: 4500, soldCount: 7800, daysAgo: 6, imageSeed: "streaming-mic", marketplace: "tokopedia", marketplaceUrl: tokopediaUrl("podcast-store", "streaming-mic-usb-condenser-boom-arm"), location: "Bandung" },
    { title: "Handheld Console Game 4.3 inch Retro 10000+ Games - Rechargable", price: 299000, originalPrice: 599000, rating: 4.6, reviewCount: 8800, soldCount: 17500, daysAgo: 2, imageSeed: "handheld-console", viralHint: true, marketplace: "shopee", marketplaceUrl: shopeeUrl("handheld-console-retro-10000-games", "9988776", "0123010123"), location: "Jakarta Pusat" },
    { title: "Gaming Desk Mechanical Keyboard Tray Cup Holder - Carbon", price: 899000, originalPrice: 1599000, rating: 4.6, reviewCount: 1400, soldCount: 1900, daysAgo: 10, imageSeed: "gaming-desk", marketplace: "lazada", marketplaceUrl: lazadaUrl("gaming-desk-mechanical-keyboard-tray", 11, 4567890), location: "Tangerang" },
  ],
  olahraga: [
    { title: "Dumbbell Set Adjustable 20kg Pair Rubber Coated - Bagus", price: 549000, originalPrice: 999000, rating: 4.8, reviewCount: 5600, soldCount: 9200, daysAgo: 4, imageSeed: "dumbbell-20kg", marketplace: "shopee", marketplaceUrl: shopeeUrl("dumbbell-set-20kg-pair-rubber-coated", "8765432", "5678567899"), location: "Jakarta Barat" },
    { title: "Matras Yoga Anti Slip 6mm TPE Eco Friendly Carrier - Free Tas", price: 99000, originalPrice: 199000, rating: 4.8, reviewCount: 12300, soldCount: 26800, daysAgo: 3, imageSeed: "matras-yoga-6mm", viralHint: true, marketplace: "shopee", marketplaceUrl: shopeeUrl("matras-yoga-6mm-tpe-eco-friendly", "8765432", "6789678999"), location: "Jakarta Barat" },
    { title: "Resistance Band Set 5 pcs Gym Fitness Training - Latex", price: 79000, originalPrice: 179000, rating: 4.7, reviewCount: 15600, soldCount: 35000, daysAgo: 2, imageSeed: "resistance-band", viralHint: true, marketplace: "shopee", marketplaceUrl: shopeeUrl("resistance-band-set-5-pcs-gym-fitness", "8765432", "7890789099"), location: "Jakarta Barat" },
    { title: "Sepatu Lari Pria Wanita Lightweight Breathable - Original", price: 249000, originalPrice: 499000, rating: 4.6, reviewCount: 9800, soldCount: 17800, daysAgo: 5, imageSeed: "sepatu-lari", marketplace: "tokopedia", marketplaceUrl: tokopediaUrl("sport-center", "sepatu-lari-lightweight-breathable"), location: "Bandung" },
    { title: "Skipping Rope Counter Digital Bearing Speed - Heavy Duty", price: 49000, originalPrice: 99000, rating: 4.7, reviewCount: 18700, soldCount: 39000, daysAgo: 1, imageSeed: "skipping-rope", viralHint: true, marketplace: "shopee", marketplaceUrl: shopeeUrl("skipping-rope-counter-digital-bearing", "8765432", "8901890199"), location: "Jakarta Barat" },
    { title: "Push Up Bar Rotating Steel Grip Strength Trainer - Pair", price: 69000, originalPrice: 149000, rating: 4.5, reviewCount: 7200, soldCount: 12800, daysAgo: 6, imageSeed: "pushup-bar", marketplace: "lazada", marketplaceUrl: lazadaUrl("push-up-bar-rotating-steel-grip", 12, 3678123), location: "Jakarta Pusat" },
    { title: "Smart Bottle Water 1L Hydration Reminder LED Display", price: 119000, originalPrice: 245000, rating: 4.6, reviewCount: 4300, soldCount: 7100, daysAgo: 7, imageSeed: "smart-bottle-1l", marketplace: "shopee", marketplaceUrl: shopeeUrl("smart-bottle-water-1l-hydration-led", "8765432", "9012901299"), location: "Jakarta Barat" },
    { title: "Kettlebell Cast Iron 12kg Vinyl Coated Grip - Original", price: 299000, originalPrice: 549000, rating: 4.7, reviewCount: 2100, soldCount: 3400, daysAgo: 9, imageSeed: "kettlebell-12kg", marketplace: "tokopedia", marketplaceUrl: tokopediaUrl("gym-equipment", "kettlebell-cast-iron-12kg-vinyl"), location: "Surabaya" },
    { title: "Treadmill Lipat Electric Home Use Incline Viral - 1 tahun", price: 2999000, originalPrice: 5999000, rating: 4.7, reviewCount: 3400, soldCount: 5800, daysAgo: 6, imageSeed: "treadmill-lipat", viralHint: true, marketplace: "shopee", marketplaceUrl: shopeeUrl("treadmill-lipat-electric-home-incline", "8765432", "0123010199"), location: "Jakarta Barat" },
    { title: "Forearm Blaster Wrist Curl Strength Builder - Strap", price: 89000, originalPrice: 199000, rating: 4.5, reviewCount: 5400, soldCount: 8900, daysAgo: 4, imageSeed: "forearm-blaster", marketplace: "lazada", marketplaceUrl: lazadaUrl("forearm-blaster-wrist-curl-strength", 13, 4678123), location: "Jakarta Selatan" },
  ],
  mainan: [
    { title: "Boneka Jumbo 1 Meter Beruang Bulu Lembut Viral Hadiah", price: 159000, originalPrice: 349000, rating: 4.9, reviewCount: 14500, soldCount: 32000, daysAgo: 2, imageSeed: "boneka-jumbo-1m", viralHint: true, marketplace: "shopee", marketplaceUrl: shopeeUrl("boneka-jumbo-1-meter-beruang-bulu", "4455667", "2345234522"), location: "Jakarta Selatan" },
    { title: "Action Figure Anime 15cm Articulated Collectible - Box", price: 199000, originalPrice: 425000, rating: 4.7, reviewCount: 3400, soldCount: 5200, daysAgo: 5, imageSeed: "action-figure-anime", marketplace: "tokopedia", marketplaceUrl: tokopediaUrl("anime-hobby", "action-figure-anime-15cm-articulated"), location: "Jakarta Pusat" },
    { title: "Puzzle 1000 pcs Landscape Premium Quality Jigsaw - Original", price: 99000, originalPrice: 199000, rating: 4.8, reviewCount: 5600, soldCount: 9400, daysAgo: 4, imageSeed: "puzzle-1000pcs", marketplace: "lazada", marketplaceUrl: lazadaUrl("puzzle-1000-pcs-landscape-premium", 14, 5678923), location: "Bandung" },
    { title: "RC Car Drift 4WD High Speed Remote Control Off Road - Batre", price: 329000, originalPrice: 649000, rating: 4.6, reviewCount: 4200, soldCount: 6800, daysAgo: 3, imageSeed: "rc-car-drift", marketplace: "shopee", marketplaceUrl: shopeeUrl("rc-car-drift-4wd-high-speed-remote", "4455667", "3456345622"), location: "Jakarta Selatan" },
    { title: "Lego Compatible Bricks City Building 1500 pcs - Berkado", price: 245000, originalPrice: 499000, rating: 4.7, reviewCount: 6700, soldCount: 11400, daysAgo: 6, imageSeed: "bricks-city-1500", marketplace: "shopee", marketplaceUrl: shopeeUrl("lego-compatible-bricks-city-1500", "4455667", "4567456722"), location: "Jakarta Selatan" },
    { title: "Board Game Catan Strategy Family 3-4 Players - Original", price: 299000, originalPrice: 549000, rating: 4.8, reviewCount: 2800, soldCount: 4200, daysAgo: 8, imageSeed: "board-game-catan", marketplace: "tokopedia", marketplaceUrl: tokopediaUrl("hobby-store", "board-game-catan-strategy-family"), location: "Bandung" },
    { title: "Slime Set DIY Kit Glitter Foam Beads Stress Relief Kids", price: 59000, originalPrice: 129000, rating: 4.6, reviewCount: 9800, soldCount: 18900, daysAgo: 3, imageSeed: "slime-diy-kit", viralHint: true, marketplace: "shopee", marketplaceUrl: shopeeUrl("slime-set-diy-kit-glitter-foam", "4455667", "5678567822"), location: "Jakarta Selatan" },
    { title: "Toy Gun Foam Blaster Darts 30 pcs Target Set - Aman", price: 189000, originalPrice: 379000, rating: 4.7, reviewCount: 4500, soldCount: 7300, daysAgo: 5, imageSeed: "toy-gun-foam", marketplace: "lazada", marketplaceUrl: lazadaUrl("toy-gun-foam-blaster-darts-target", 15, 6678123), location: "Tangerang" },
    { title: "Magic Cube Speed Cube 3x3 Stickerless Pro - Original", price: 69000, originalPrice: 149000, rating: 4.8, reviewCount: 15600, soldCount: 34500, daysAgo: 2, imageSeed: "magic-cube-3x3", viralHint: true, marketplace: "shopee", marketplaceUrl: shopeeUrl("magic-cube-speed-cube-3x3-stickerless", "4455667", "6789678922"), location: "Jakarta Selatan" },
    { title: "Boneka Mini Keychain Plush 10 pcs - Hadiah Anak", price: 49000, originalPrice: 99000, rating: 4.5, reviewCount: 12300, soldCount: 24500, daysAgo: 1, imageSeed: "plush-mini-10pcs", marketplace: "shopee", marketplaceUrl: shopeeUrl("boneka-mini-keychain-plush-10-pcs", "4455667", "7890789022"), location: "Jakarta Selatan" },
  ],
  otomotif: [
    { title: "Dashcam WiFi 4K Dual Lens Night Vision Viral - Garansi", price: 599000, originalPrice: 1299000, rating: 4.7, reviewCount: 4500, soldCount: 7200, daysAgo: 4, imageSeed: "dashcam-4k-wifi", viralHint: true, marketplace: "shopee", marketplaceUrl: shopeeUrl("dashcam-wifi-4k-dual-lens-night", "7788990", "9012901234"), location: "Jakarta Barat" },
    { title: "Vacuum Cleaner Mobil Wireless Powerful Handheld - Portable", price: 199000, originalPrice: 425000, rating: 4.6, reviewCount: 8900, soldCount: 15400, daysAgo: 3, imageSeed: "vacuum-mobil", marketplace: "shopee", marketplaceUrl: shopeeUrl("vacuum-cleaner-mobil-wireless-portable", "7788990", "0123010234"), location: "Jakarta Barat" },
    { title: "Cover Mobil Anti Air UV Full Size Premium Tahan Lama", price: 299000, originalPrice: 599000, rating: 4.7, reviewCount: 6700, soldCount: 11200, daysAgo: 5, imageSeed: "cover-mobil-uv", marketplace: "tokopedia", marketplaceUrl: tokopediaUrl("auto-care", "cover-mobil-anti-air-uv-full-size"), location: "Jakarta Pusat" },
    { title: "Phone Holder Car Dashboard 360 Suction Cup Magnetic Viral", price: 89000, originalPrice: 199000, rating: 4.8, reviewCount: 14500, soldCount: 32000, daysAgo: 2, imageSeed: "phone-holder-car", viralHint: true, marketplace: "shopee", marketplaceUrl: shopeeUrl("phone-holder-car-360-suction-magnetic", "7788990", "1234123434"), location: "Jakarta Barat" },
    { title: "LED Strip Interior Mobil RGB Music Sync Remote - 12V", price: 99000, originalPrice: 225000, rating: 4.7, reviewCount: 8400, soldCount: 17800, daysAgo: 3, imageSeed: "led-strip-mobil", marketplace: "lazada", marketplaceUrl: lazadaUrl("led-strip-interior-mobil-rgb-music", 16, 7678123), location: "Jakarta Selatan" },
    { title: "Tire Inflator Portable Electric 12V Digital Display - Pump", price: 289000, originalPrice: 599000, rating: 4.6, reviewCount: 5600, soldCount: 9400, daysAgo: 6, imageSeed: "tire-inflator", marketplace: "shopee", marketplaceUrl: shopeeUrl("tire-inflator-portable-electric-12v", "7788990", "2345234534"), location: "Jakarta Barat" },
    { title: "Helm Full Face Double Visor Standard SNI Premium - Garansi", price: 365000, originalPrice: 699000, rating: 4.7, reviewCount: 7200, soldCount: 12800, daysAgo: 4, imageSeed: "helm-fullface-sni", marketplace: "tokopedia", marketplaceUrl: tokopediaUrl("helm-store", "helm-full-face-double-visor-sni"), location: "Bandung" },
    { title: "Car Charger Fast Charging 54W Dual USB PD QC - Universal", price: 79000, originalPrice: 169000, rating: 4.8, reviewCount: 11200, soldCount: 24500, daysAgo: 2, imageSeed: "car-charger-54w", marketplace: "shopee", marketplaceUrl: shopeeUrl("car-charger-fast-54w-dual-usb", "7788990", "3456345634"), location: "Jakarta Barat" },
    { title: "Wiper Blade Silicone Frameless Silent Clean Streak - Pair", price: 89000, originalPrice: 199000, rating: 4.6, reviewCount: 4500, soldCount: 7100, daysAgo: 7, imageSeed: "wiper-blade", marketplace: "lazada", marketplaceUrl: lazadaUrl("wiper-blade-silicone-frameless-silent", 17, 8678123), location: "Jakarta Selatan" },
    { title: "Cover Motor Waterproof Dustproof UV Protection - Universal", price: 119000, originalPrice: 249000, rating: 4.5, reviewCount: 3200, soldCount: 4900, daysAgo: 8, imageSeed: "cover-motor-uv", marketplace: "shopee", marketplaceUrl: shopeeUrl("cover-motor-waterproof-uv-protection", "7788990", "4567456734"), location: "Jakarta Barat" },
  ],
};

/**
 * Generate produk mock untuk kategori tertentu (marketplace lokal Indonesia).
 */
export function generateMockProducts(
  categoryId: string,
  categoryName: string,
  count = 10
): Product[] {
  const slug = categoryId.toLowerCase().trim();
  const templates = TEMPLATES[slug] ?? TEMPLATES.elektronik;
  const results: Product[] = [];

  for (let i = 0; i < count; i++) {
    const tpl = templates[i % templates.length];
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
    const image = `https://picsum.photos/seed/${tpl.imageSeed}-${i % 5}/400/400`;

    results.push({
      id,
      title,
      url: tpl.marketplaceUrl,
      // affiliateUrl diisi oleh API route setelah load tags dari DB
      image,
      price: tpl.price,
      originalPrice: tpl.originalPrice,
      discountPercent,
      rating: tpl.rating,
      reviewCount: tpl.reviewCount,
      soldCount: tpl.soldCount,
      soldPerDay: Math.round(soldPerDay * 10) / 10,
      timestamp,
      marketplace: tpl.marketplace,
      category: categoryName,
      categorySlug: slug,
      viralScore: Math.round(viralScore * 100) / 100,
      isViral: viralScore >= VIRAL_SCORE_THRESHOLD,
      location: tpl.location,
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
 * Cek apakah RAPIDAPI_KEY di-set (untuk AliExpress live).
 */
export function hasRapidApiKey(): boolean {
  return Boolean(process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_KEY.trim().length > 0);
}
