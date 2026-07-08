import { db } from "@/lib/db";

export interface DefaultCategory {
  name: string;
  emoji: string;
  keywords: string;
  amazonNode: string | null;
  aliexpressCat: string | null;
  shopeeCat: string | null;
  tokopediaCat: string | null;
  lazadaCat: string | null;
  accesstradeCat: string | null;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    name: "Elektronik",
    emoji: "🔌",
    keywords: "elektronik,gadget,smartphone,headphone,smartwatch,earbuds,powerbank,charger",
    amazonNode: "172282",
    aliexpressCat: "consumer-electronics",
    shopeeCat: "elektronik",
    tokopediaCat: "elektronik",
    lazadaCat: "elektronik",
    accesstradeCat: "Mobile & Gadgets,Computers & Accessories,Electronic Accessories,Cameras & Drones,Smart Devices,Watches",
  },
  {
    name: "Fashion",
    emoji: "👗",
    keywords: "fashion,pakaian,sepatu,tas,aksesoris,kaos,celana,dress",
    amazonNode: "714112301",
    aliexpressCat: "apparel-accessories",
    shopeeCat: "fashion-pria",
    tokopediaCat: "fashion",
    lazadaCat: "fashion",
    accesstradeCat: "Women's Fashion,Men's Fashion,Muslim Fashion,Kids Fashion,Travel & Luggage,Jewelry & Accessories",
  },
  {
    name: "Beauty",
    emoji: "💄",
    keywords: "beauty,kosmetik,skincare,makeup,parfum,serum,sunscreen,lipstik",
    amazonNode: "3760911",
    aliexpressCat: "beauty-health",
    shopeeCat: "perawatan-kecantikan",
    tokopediaCat: "kecantikan",
    lazadaCat: "kecantikan",
    accesstradeCat: "Beauty,Health,Health & Personal Care",
  },
  {
    name: "Home",
    emoji: "🏠",
    keywords: "rumah,dapur,dekor,furnitur,perabot,kitchen,air-fryer,diffuser",
    amazonNode: "1055398",
    aliexpressCat: "home-garden",
    shopeeCat: "perlengkapan-rumah",
    tokopediaCat: "perlengkapan-rumah-tangga",
    lazadaCat: "peralatan-rumah-tangga",
    accesstradeCat: "Home & Living,Home Appliances,Pets,Food & Beverages,Groceries,Books & Stationery",
  },
  {
    name: "Gaming",
    emoji: "🎮",
    keywords: "gaming,console,controller,keyboard,mouse,gaming-pc,headset",
    amazonNode: "468642",
    aliexpressCat: "computer-office",
    shopeeCat: "gaming",
    tokopediaCat: "gaming",
    lazadaCat: "gaming",
    accesstradeCat: "Gaming",
  },
  {
    name: "Olahraga",
    emoji: "⚽",
    keywords: "olahraga,fitness,outdoor,lari,yoga,gym,dumbbell,sepatu",
    amazonNode: "3375251",
    aliexpressCat: "sports-entertainment",
    shopeeCat: "olahraga-outdoor",
    tokopediaCat: "olahraga",
    lazadaCat: "olahraga-outdoor",
    accesstradeCat: "Sports & Outdoors",
  },
  {
    name: "Mainan",
    emoji: "🧸",
    keywords: "mainan,anak,boneka,action figure,puzzle,rc,lego,board game",
    amazonNode: "165793011",
    aliexpressCat: "toys-hobbies",
    shopeeCat: "mainan-hobi",
    tokopediaCat: "hobi-koleksi",
    lazadaCat: "mainan-hobi",
    accesstradeCat: "Mom & Baby,Toys & Games,Kids & Baby",
  },
  {
    name: "Otomotif",
    emoji: "🚗",
    keywords: "otomotif,mobil,motor,sparepart,aksesoris mobil,helm,dashcam",
    amazonNode: "15684181",
    aliexpressCat: "automobiles-motorcycles",
    shopeeCat: "otomotif",
    tokopediaCat: "otomotif",
    lazadaCat: "otomotif",
    accesstradeCat: "Automotive",
  },
  {
    name: "Travel",
    emoji: "✈️",
    keywords: "travel,hotel,tiket pesawat,penginapan,villa,liburan,wisata,traveloka,klook",
    amazonNode: null,
    aliexpressCat: null,
    shopeeCat: null,
    tokopediaCat: null,
    lazadaCat: null,
    accesstradeCat: "TRAVEL and LEISURE",
  },
  {
    name: "Keuangan",
    emoji: "💳",
    keywords: "keuangan,asuransi,kartu kredit,pinjaman,paylater,investasi,kpr,multifinance",
    amazonNode: null,
    aliexpressCat: null,
    shopeeCat: null,
    tokopediaCat: null,
    lazadaCat: null,
    accesstradeCat: "FINANCIAL SERVICES",
  },
  {
    name: "Layanan Online",
    emoji: "💻",
    keywords: "layanan online,subscription,software,vpn,cloud hosting,domain,ai tools,rukita",
    amazonNode: null,
    aliexpressCat: null,
    shopeeCat: null,
    tokopediaCat: null,
    lazadaCat: null,
    accesstradeCat: "ONLINE SERVICES",
  },
];

// In-memory lock untuk mencegah race condition antar request pertama
let seedingPromise: Promise<void> | null = null;

/**
 * Pastikan kategori default ada di database.
 * Dipanggil saat runtime jika tabel kategori kosong.
 */
export async function ensureCategoriesSeeded(): Promise<void> {
  if (seedingPromise) {
    return seedingPromise;
  }

  seedingPromise = (async () => {
    try {
      const count = await db.category.count();
      if (count === 0) {
        await db.category.createMany({
          data: DEFAULT_CATEGORIES.map((c, i) => ({
            name: c.name,
            emoji: c.emoji,
            keywords: c.keywords,
            amazonNode: c.amazonNode ?? null,
            aliexpressCat: c.aliexpressCat ?? null,
            shopeeCat: c.shopeeCat ?? null,
            tokopediaCat: c.tokopediaCat ?? null,
            lazadaCat: c.lazadaCat ?? null,
            accesstradeCat: c.accesstradeCat ?? null,
            order: i,
            enabled: true,
          })),
        });
        console.log(`[seed] Seeded ${DEFAULT_CATEGORIES.length} default categories`);
      } else {
        // Update existing categories yang belum punya accesstradeCat
        const existing = await db.category.findMany();
        const existingNames = new Set(existing.map(c => c.name));

        // Add kategori baru yang belum ada di DB (cth: Travel, Keuangan, Layanan Online)
        let addedCount = 0;
        for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
          const c = DEFAULT_CATEGORIES[i];
          if (!existingNames.has(c.name)) {
            try {
              await db.category.create({
                data: {
                  name: c.name,
                  emoji: c.emoji,
                  keywords: c.keywords,
                  amazonNode: c.amazonNode ?? null,
                  aliexpressCat: c.aliexpressCat ?? null,
                  shopeeCat: c.shopeeCat ?? null,
                  tokopediaCat: c.tokopediaCat ?? null,
                  lazadaCat: c.lazadaCat ?? null,
                  accesstradeCat: c.accesstradeCat ?? null,
                  order: i,
                  enabled: true,
                },
              });
              addedCount++;
            } catch (err) {
              // Skip kalau sudah ada (race condition)
            }
          }
        }
        if (addedCount > 0) {
          console.log(`[seed] Added ${addedCount} new default categories`);
        }

        // Update existing yang belum punya accesstradeCat
        for (const cat of existing) {
          if (cat.accesstradeCat) continue;
          const defaultCat = DEFAULT_CATEGORIES.find(d => d.name === cat.name);
          if (defaultCat?.accesstradeCat) {
            await db.category.update({
              where: { id: cat.id },
              data: { accesstradeCat: defaultCat.accesstradeCat },
            });
          }
        }
      }
    } catch (err) {
      console.error("[seed] Failed to seed categories:", err);
      seedingPromise = null;
    }
  })();

  return seedingPromise;
}

/**
 * Pastikan baris AffiliateTag untuk semua marketplace ada (kosong by default).
 */
export async function ensureAffiliateTagsSeeded(): Promise<void> {
  try {
    const marketplaces = ["shopee", "tokopedia", "lazada", "aliexpress"];
    for (const m of marketplaces) {
      const existing = await db.affiliateTag.findUnique({
        where: { marketplace: m },
      });
      if (!existing) {
        await db.affiliateTag.create({
          data: {
            marketplace: m,
            tag: "",
            enabled: false,
          },
        });
      }
    }
  } catch (err) {
    console.error("[seed] Failed to seed affiliate tags:", err);
  }
}
