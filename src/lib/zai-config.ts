/**
 * Z-AI SDK initializer for Vercel deployment.
 *
 * The z-ai-web-dev-sdk normally reads config from .z-ai-config file,
 * but Vercel serverless has a read-only filesystem — so we bypass
 * file-based config and create the ZAI instance directly from env vars.
 *
 * Required env vars (set in Vercel Dashboard):
 * - ZAI_BASE_URL  (required)
 * - ZAI_API_KEY   (required)
 * - ZAI_CHAT_ID   (optional)
 * - ZAI_TOKEN     (optional)
 * - ZAI_USER_ID   (optional)
 */

import fs from "fs";
import path from "path";
import os from "os";
import ZAI from "z-ai-web-dev-sdk";

const CONFIG_PATHS = [
  path.join(process.cwd(), ".z-ai-config"),
  path.join(os.homedir(), ".z-ai-config"),
  "/etc/.z-ai-config",
];

export interface ZaiConfig {
  baseUrl: string;
  apiKey: string;
  chatId: string;
  token: string;
  userId: string;
}

/**
 * Get ZAI config from either:
 * 1. Existing .z-ai-config file (local dev)
 * 2. Environment variables (Vercel / production)
 */
export function getZaiConfig(): ZaiConfig | null {
  // 1. Try reading from existing config file (local dev)
  for (const p of CONFIG_PATHS) {
    try {
      const content = fs.readFileSync(p, "utf-8");
      const config = JSON.parse(content);
      if (config.baseUrl && config.apiKey) {
        return config as ZaiConfig;
      }
    } catch {
      // File doesn't exist, continue
    }
  }

  // 2. Try from environment variables (Vercel / production)
  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;

  if (!baseUrl || !apiKey) {
    console.warn("[zai-config] ZAI_BASE_URL or ZAI_API_KEY not set — AI features will not work");
    return null;
  }

  return {
    baseUrl,
    apiKey,
    chatId: process.env.ZAI_CHAT_ID || "",
    token: process.env.ZAI_TOKEN || "",
    userId: process.env.ZAI_USER_ID || "",
  };
}

/**
 * Create a ZAI SDK instance — works both locally (file-based config)
 * and on Vercel (env-var-based config, no filesystem writes needed).
 */
export async function createZai(): Promise<ZAI> {
  const config = getZaiConfig();

  if (!config) {
    throw new Error("ZAI config not found. Set ZAI_BASE_URL & ZAI_API_KEY env vars or create .z-ai-config file.");
  }

  // Use constructor directly with config object — bypasses file-based loadConfig()
  return new ZAI(config);
}

/**
 * Legacy compat — just checks if config is available.
 */
export function ensureZaiConfig(): boolean {
  return getZaiConfig() !== null;
}
