#!/bin/bash
# AI-2 BOT — Wrapper script
# Jalankan bot listener di terminal
# 
# Cara pakai:
#   bash scripts/bot.sh
#
# Perintah di Telegram:
#   /viral [id]     → tandai viral
#   /reject [id]    → cabut viral
#   /status         → status JB
#   /help           → daftar perintah

export DATABASE_URL="postgresql://neondb_owner:npg_xQgfawEGy2u8@ep-muddy-sound-aodlj3hw-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

npx tsx scripts/ai-bot.ts
