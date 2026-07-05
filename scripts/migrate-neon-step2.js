const { Client } = require('pg');

const DATABASE_URL = "postgresql://neondb_owner:npg_xQgfawEGy2u8@ep-muddy-sound-aodlj3hw-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("✅ Connected to Neon");

    // Update kategori yang belum punya accesstradeCat
    const updates = [
      { name: 'Fashion wanita', at: "Women's Fashion,Muslim Fashion" },
      { name: 'Fashion Pria', at: "Men's Fashion,Muslim Fashion" },
      { name: 'Fashion Anak', at: "Kids Fashion" },
      { name: 'kesehatan', at: 'Health,Health & Personal Care' },
      { name: 'kelistrikan', at: 'Electronic Accessories,Computers & Accessories' },
    ];

    for (const u of updates) {
      const res = await client.query(
        `UPDATE "Category" SET "accesstradeCat" = $1 WHERE "name" = $2 AND "accesstradeCat" IS NULL`,
        [u.at, u.name]
      );
      console.log(`  ✅ ${u.name}: ${res.rowCount} rows updated`);
    }

    // Verify
    const result = await client.query(`SELECT "name", "accesstradeCat" FROM "Category" ORDER BY "order"`);
    console.log("\n📋 All categories:");
    for (const row of result.rows) {
      const at = row.accesstradeCat || '(empty)';
      console.log(`  ${row.name}: ${at}`);
    }

    console.log("\n✅ Done!");
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
