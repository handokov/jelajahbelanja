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

    // 1. Add column
    await client.query(`ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "accesstradeCat" TEXT`);
    console.log("✅ Column accesstradeCat added");

    // 2. Update existing categories with AT mapping
    const updates = [
      { name: 'Elektronik', at: 'Mobile & Gadgets,Computers & Accessories,Electronic Accessories,Cameras & Drones,Smart Devices,Watches' },
      { name: 'Fashion', at: "Women's Fashion,Men's Fashion,Muslim Fashion,Kids Fashion,Travel & Luggage,Jewelry & Accessories" },
      { name: 'Beauty', at: 'Beauty,Health,Health & Personal Care' },
      { name: 'Home', at: 'Home & Living,Home Appliances,Pets,Food & Beverages,Groceries,Books & Stationery' },
      { name: 'Gaming', at: 'Gaming' },
      { name: 'Olahraga', at: 'Sports & Outdoors' },
      { name: 'Mainan', at: 'Mom & Baby,Toys & Games,Kids & Baby' },
      { name: 'Otomotif', at: 'Automotive' },
    ];

    for (const u of updates) {
      const res = await client.query(
        `UPDATE "Category" SET "accesstradeCat" = $1 WHERE "name" = $2 AND "accesstradeCat" IS NULL`,
        [u.at, u.name]
      );
      console.log(`  ✅ ${u.name}: ${res.rowCount} rows updated`);
    }

    // 3. Verify
    const result = await client.query(`SELECT "name", "accesstradeCat" FROM "Category" ORDER BY "order"`);
    console.log("\n📋 Current categories:");
    for (const row of result.rows) {
      console.log(`  ${row.name}: ${row.accesstradeCat || '(empty)'}`);
    }

    console.log("\n✅ Migration complete!");
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
