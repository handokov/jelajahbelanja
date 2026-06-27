import { db } from "@/lib/db";

export interface DefaultCategory {
  name: string;
  emoji: string;
  keywords: string;
  amazonNode: string | null;
  aliexpressCat: string | null;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    name: "Elektronik",
    emoji: "🔌",
    keywords: "electronics,gadget,smartphone,headphone,smartwatch",
    amazonNode: "172282",
    aliexpressCat: "consumer-electronics",
  },
  {
    name: "Fashion",
    emoji: "👗",
    keywords: "fashion,clothing,shoes,bag,accessories",
    amazonNode: "714112301",
    aliexpressCat: "apparel-accessories",
  },
  {
    name: "Beauty",
    emoji: "💄",
    keywords: "beauty,cosmetics,skincare,makeup,fragrance",
    amazonNode: "3760911",
    aliexpressCat: "beauty-health",
  },
  {
    name: "Home",
    emoji: "🏠",
    keywords: "home,kitchen,decor,furniture,appliance",
    amazonNode: "1055398",
    aliexpressCat: "home-garden",
  },
  {
    name: "Gaming",
    emoji: "🎮",
    keywords: "gaming,console,controller,keyboard,mouse,gaming-pc",
    amazonNode: "468642",
    aliexpressCat: "computer-office",
  },
  {
    name: "Olahraga",
    emoji: "⚽",
    keywords: "sports,fitness,outdoor,running,yoga,gym",
    amazonNode: "3375251",
    aliexpressCat: "sports-entertainment",
  },
  {
    name: "Mainan",
    emoji: "🧸",
    keywords: "toys,kids,action figure,doll,board game",
    amazonNode: "165793011",
    aliexpressCat: "toys-hobbies",
  },
  {
    name: "Otomotif",
    emoji: "🚗",
    keywords: "automotive,car,motorcycle,parts,accessories car",
    amazonNode: "15684181",
    aliexpressCat: "automobiles-motorcycles",
  },
];

// In-memory lock untuk mencegah race condition antar request pertama
let seedingPromise: Promise<void> | null = null;

/**
 * Pastikan kategori default ada di database.
 * Dipanggil saat runtime jika tabel kategori kosong.
 * Thread-safe via in-memory promise lock.
 */
export async function ensureCategoriesSeeded(): Promise<void> {
  if (seedingPromise) {
    return seedingPromise;
  }

  seedingPromise = (async () => {
    try {
      const count = await db.category.count();
      if (count === 0) {
        // Pakai createMany dengan skipDuplicates untuk safety tambahan
        await db.category.createMany({
          data: DEFAULT_CATEGORIES.map((c, i) => ({
            name: c.name,
            emoji: c.emoji,
            keywords: c.keywords,
            amazonNode: c.amazonNode,
            aliexpressCat: c.aliexpressCat,
            order: i,
            enabled: true,
          })),
          skipDuplicates: true,
        });
        console.log(`[seed] Seeded ${DEFAULT_CATEGORIES.length} default categories`);
      }
    } catch (err) {
      console.error("[seed] Failed to seed categories:", err);
      // Reset promise supaya bisa retry di request berikutnya
      seedingPromise = null;
    }
  })();

  return seedingPromise;
}
