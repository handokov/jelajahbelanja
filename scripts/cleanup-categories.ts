// Quick script to inspect & clean up duplicate categories
import { db } from "../src/lib/db";

async function main() {
  const all = await db.category.findMany({ orderBy: { order: "asc" } });
  console.log("Total categories:", all.length);
  console.log(
    "Categories:",
    all.map((c) => `${c.emoji} ${c.name} (order=${c.order})`).join("\n")
  );

  // Hapus duplikat: keep first occurrence by name, delete the rest
  const seen = new Set<string>();
  const toDelete: string[] = [];
  for (const c of all) {
    if (seen.has(c.name)) {
      toDelete.push(c.id);
    } else {
      seen.add(c.name);
    }
  }
  console.log(`\nWill delete ${toDelete.length} duplicate(s)`);
  if (toDelete.length > 0) {
    await db.category.deleteMany({ where: { id: { in: toDelete } } });
    console.log("Deleted.");
  }

  // Re-number order
  const remaining = await db.category.findMany({ orderBy: { order: "asc" } });
  for (let i = 0; i < remaining.length; i++) {
    await db.category.update({
      where: { id: remaining[i].id },
      data: { order: i },
    });
  }
  console.log("Re-numbered. Final count:", remaining.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
