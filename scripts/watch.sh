#!/bin/bash
# AI-2 WATCH — Wrapper script
# Cara pakai:
#   bash scripts/watch.sh           (cek viral)
#   bash scripts/watch.sh --report  (laporan harian)

export DATABASE_URL="postgresql://neondb_owner:npg_xQgfawEGy2u8@ep-muddy-sound-aodlj3hw-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

npx tsx scripts/ai-watch.ts "$@"
