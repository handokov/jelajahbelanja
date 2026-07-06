/**
 * JB Image Server — v2.1 (Cloudinary SDK Edition)
 * 
 * Upload gambar produk Tokopedia/Shopee ke Cloudinary.
 * URL gambar jadi PERMANEN — laptop mati pun tetap bisa diakses!
 * 
 * Menggunakan Cloudinary SDK (lebih reliable dari manual signature)
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

// ── Load .env ──
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  }
}

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const API_KEY = process.env.CLOUDINARY_API_KEY || '';
const API_SECRET = process.env.CLOUDINARY_API_SECRET || '';
const FOLDER = process.env.CLOUDINARY_FOLDER || 'jb-products';

// ── Configure Cloudinary SDK ──
cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
  secure: true,
});

const app = express();
const PORT = 3000;

// Parse JSON body
app.use(express.json());

// ── Stats tracking ──
const stats = {
  uploads: 0,
  cached: 0,
  failed: 0,
  totalBytes: 0,
  startTime: new Date().toISOString(),
};

// ── Check Cloudinary config ──
function isCloudinaryConfigured() {
  return CLOUD_NAME && API_KEY && API_SECRET;
}

// ── Generate public_id dari URL (nama file di Cloudinary) ──
function generatePublicId(imageUrl) {
  // Coba ambil nama file dari URL buat nama yang lebih readable
  try {
    const urlObj = new URL(imageUrl);
    const parts = urlObj.pathname.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1] || '';
    
    if (lastPart && lastPart.length > 3) {
      let cleanName = lastPart
        .replace(/[?#].*$/, '')
        .replace(/\.[^.]+$/, '')  // Buang extension
        .replace(/[^a-zA-Z009_-]/g, '_')
        .substring(0, 40);
      return `${FOLDER}/${cleanName}`;
    }
  } catch {}
  
  // Fallback: random hash
  const hash = Math.random().toString(36).substring(2, 10);
  return `${FOLDER}/product_${hash}`;
}

// ── Upload gambar ke Cloudinary via SDK ──
async function uploadToCloudinary(imageUrl) {
  if (!isCloudinaryConfigured()) {
    return { success: false, error: 'Cloudinary belum dikonfigurasi. Isi .env file!', url: imageUrl };
  }

  try {
    console.log(`  📥 Processing: ${imageUrl.substring(0, 60)}...`);
    
    // Upload langsung dari URL — Cloudinary akan download sendiri
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: FOLDER,
      quality: 'auto',
      fetch_format: 'auto',
      // Don't overwrite if exists
      overwrite: false,
      // Use URL as resource
      type: 'upload',
    });

    stats.uploads++;
    stats.totalBytes += result.bytes || 0;
    
    console.log(`  ✅ Uploaded: ${result.public_id}`);
    
    return {
      success: true,
      localUrl: result.secure_url,
      cloudinaryUrl: result.secure_url,
      publicId: result.public_id,
      bytes: result.bytes,
    };

  } catch (error) {
    // Kalau error karena already exists, itu OK — return URL
    if (error.message && error.message.includes('already exists')) {
      console.log(`  ⚠️ Already exists, getting URL...`);
      stats.cached++;
      
      // Get existing image URL
      try {
        const publicId = generatePublicId(imageUrl);
        const existing = await cloudinary.api.resource(publicId);
        return {
          success: true,
          localUrl: existing.secure_url,
          cloudinaryUrl: existing.secure_url,
          cached: true,
        };
      } catch {
        // Kalau gak bisa get, return original URL
        return { success: false, error: 'already_exists_but_cant_get_url', url: imageUrl };
      }
    }
    
    stats.failed++;
    console.log(`  ❌ Error: ${error.message}`);
    return { success: false, error: error.message, url: imageUrl };
  }
}

// ── Download & upload 1 gambar ──
async function processImage(imageUrl) {
  if (!imageUrl) return { success: false, error: 'No URL', url: imageUrl };
  
  // Kalau udah Cloudinary URL, skip
  if (imageUrl.includes('cloudinary.com') || imageUrl.includes('res.cloudinary.com')) {
    return { success: true, localUrl: imageUrl, cloudinaryUrl: imageUrl, cached: true };
  }

  // Upload ke Cloudinary
  return await uploadToCloudinary(imageUrl);
}

// ── Health check ──
app.get('/health', async (req, res) => {
  const configured = isCloudinaryConfigured();
  
  let cloudStatus = 'not_configured';
  let storageInfo = null;
  
  if (configured) {
    try {
      // Ping Cloudinary via SDK
      await cloudinary.api.ping();
      
      // Get usage info
      const usage = await cloudinary.api.usage();
      const storageUsed = usage.storage?.usage || 0;
      const storageLimit = usage.storage?.limit || 0;
      const storagePercent = storageLimit > 0 ? ((storageUsed / storageLimit) * 100).toFixed(1) : '?';
      
      storageInfo = {
        usedMB: (storageUsed / 1024 / 1024).toFixed(1),
        limitGB: (storageLimit / 1024 / 1024 / 1024).toFixed(1),
        percent: storagePercent,
      };
      
      cloudStatus = 'connected';
    } catch (error) {
      cloudStatus = 'error: ' + (error.message || 'unknown');
    }
  }

  res.json({
    status: configured ? 'ok' : 'not_configured',
    cloudinary: cloudStatus,
    cloudName: CLOUD_NAME || '(not set)',
    folder: FOLDER,
    storage: storageInfo,
    stats: {
      uploads: stats.uploads,
      cached: stats.cached,
      failed: stats.failed,
      totalMB: (stats.totalBytes / 1024 / 1024).toFixed(1),
    },
    port: PORT,
    message: configured ? 'JB Image Server + Cloudinary aktif! 🚀' : '⚠️ Isi .env dulu!',
  });
});

// ── Stats ──
app.get('/stats', (req, res) => {
  res.json({
    ...stats,
    totalMB: (stats.totalBytes / 1024 / 1024).toFixed(1),
    uptime: Math.round((Date.now() - new Date(stats.startTime).getTime()) / 1000 / 60) + ' min',
  });
});

// ── POST /download?url=<image_url> ──
app.post('/download', async (req, res) => {
  const imageUrl = req.query.url || req.body?.url;
  
  if (!imageUrl) {
    return res.status(400).json({ error: 'Parameter url diperlukan. Pakai ?url=... atau body { url: "..." }' });
  }
  
  console.log(`🖼️ Process: ${imageUrl.substring(0, 80)}...`);
  const result = await processImage(imageUrl);
  res.json(result);
});

// ── POST /batch ──
app.post('/batch', async (req, res) => {
  const { urls } = req.body;
  
  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'Body harus berisi { urls: ["url1", "url2", ...] }' });
  }
  
  if (urls.length > 50) {
    return res.status(400).json({ error: 'Maksimal 50 URL per request' });
  }
  
  console.log(`🖼️ Batch upload: ${urls.length} gambar ke Cloudinary`);
  
  // Upload paralel (max 5 concurrent)
  const results = [];
  const concurrency = 5;
  
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(url => processImage(url)));
    results.push(...batchResults);
    
    // Progress log
    const done = Math.min(i + concurrency, urls.length);
    console.log(`  📊 Progress: ${done}/${urls.length}`);
  }
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`📊 Batch done: ${successCount} success, ${failCount} failed`);
  
  res.json({
    total: urls.length,
    success: successCount,
    failed: failCount,
    results,
  });
});

// ── Start server ──
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   🖼️  JB Image Server v2.1 (Cloudinary SDK)  🖼️    ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Server: http://localhost:${PORT}                   ║`);
  console.log(`║  Cloud:  ${isCloudinaryConfigured() ? '✅ Configured' : '❌ Not configured'}                       ║`);
  console.log(`║  Cloud:  ${CLOUD_NAME || '(not set)'}                             ║`);
  console.log(`║  Folder: ${FOLDER}                                ║`);
  console.log('║                                                  ║');
  console.log('║  ✅ Gambar di-upload ke Cloudinary via SDK        ║');
  console.log('║  ✅ URL permanen, laptop mati pun tetap bisa!    ║');
  console.log('║  ✅ Free tier: 25 GB storage                     ║');
  console.log('║                                                  ║');
  console.log('║  Tekan Ctrl+C buat stop server                   ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
});