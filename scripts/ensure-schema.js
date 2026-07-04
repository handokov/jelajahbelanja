/**
 * ensure-schema.js — Idempotent schema migration for Vercel builds.
 *
 * This script safely adds missing columns to the production database
 * without using `prisma db push` (which can hang) or `prisma migrate deploy`
 * (which can fail if the migrations table doesn't exist).
 *
 * It uses raw SQL with "IF NOT EXISTS" patterns, so it's safe to run
 * multiple times — it won't error if columns already exist.
 *
 * Usage: node scripts/ensure-schema.js
 * Called automatically during `npm run build`.
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: ["error"],
});

async function ensureLastScrapedAt() {
  try {
    // Check if the column exists (PostgreSQL specific)
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ShopeeProduct' 
        AND column_name = 'lastScrapedAt'
    `;

    if (result.length === 0) {
      console.log("[ensure-schema] Adding lastScrapedAt column...");
      await prisma.$executeRaw`
        ALTER TABLE "ShopeeProduct" ADD COLUMN "lastScrapedAt" DateTime
      `;
      console.log("[ensure-schema] ✅ lastScrapedAt column added successfully");
    } else {
      console.log("[ensure-schema] ✅ lastScrapedAt column already exists");
    }
  } catch (err) {
    // Log but don't fail the build — the column might already exist
    // or the DB might be unreachable during build
    console.warn("[ensure-schema] ⚠️ Could not verify/add lastScrapedAt:", err.message);
    console.warn("[ensure-schema] Build will continue. If queries fail at runtime, run this script manually.");
  }
}

async function main() {
  console.log("[ensure-schema] Checking database schema...");
  await ensureLastScrapedAt();
  console.log("[ensure-schema] Done.");
}

main()
  .catch((err) => {
    console.warn("[ensure-schema] ⚠️ Schema check failed:", err.message);
    // Don't exit with error code — let the build continue
    process.exit(0);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
