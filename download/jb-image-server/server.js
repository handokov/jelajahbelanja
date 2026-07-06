/**
 * JB Image Server — v2.0 (Cloudinary Edition)
 * 
 * Upload gambar produk Tokopedia/Shopee ke Cloudinary.
 * URL gambar jadi PERMANEN — laptop mati pun tetap bisa diakses!
 * 
 * Cloudinary Free Tier:
 *   - 25 GB storage (~100.000+ gambar produk)
 *   - 25 GB bandwidth/bulan
 *   - CDN global, URL permanen
 * 
 * Cara setup:
 *   1. Daftar gratis di https://cloudinary.com/users/register_free
 *   2. Dari Dashboard, copy: Cloud Name, API Key, API Secret
 *   3. Copy .env.example jadi .env, isi credential-nya
 *   4. npm install
 *   5. node server.js   (atau double-click start.bat)
 * 
 * Endpoint:
 *   POST /download?url=<image_url>   → Download & upload ke Cloudinary
 *   GET  /health                      → Cek server + Cloudinary connection
 *   POST /batch                       → Upload banyak gambar sekaligus
 *   GET  /stats                       → Statistik upload
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

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
  const hash = crypto.createHash('md5').update(imageUrl).digest('hex').substring(0, 16);
  
  // Coba ambil nama file dari URL buat nama yang lebih readable
  try {
    const urlObj = new URL(imageUrl);
    const parts = urlObj.pathname.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1] || '';
    
    if (lastPart && lastPart.length > 3) {
      let cleanName = lastPart
        .replace(/[?#].*$/, '')
        .replace(/\.[^.]+$/, '')  // Buang extension
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 50);
      return `${FOLDER}/${cleanName}_${hash}`;
    }
  } catch {}
  
  return `${FOLDER}/${hash}`;
}

// ── Upload gambar ke Cloudinary via API ──
async function uploadToCloudinary(imageUrl) {
  if (!isCloudinaryConfigured()) {
    return { success: false, error: 'Cloudinary belum dikonfigurasi. Isi .env file!', url: imageUrl };
  }

  const publicId = generatePublicId(imageUrl);

  try {
    // Step 1: Download gambar dulu
    console.log(`  📥 Download: ${imageUrl.substring(0, 80)}...`);
    
    const downloadResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': new URL(imageUrl).origin + '/',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!downloadResponse.ok) {
      stats.failed++;
      return { success: false, error: `Download gagal: HTTP ${downloadResponse.status}`, url: imageUrl };
    }

    const contentType = downloadResponse.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await downloadResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length < 100) {
      stats.failed++;
      return { success: false, error: 'File terlalu kecil (bukan gambar)', url: imageUrl };
    }

    // Step 2: Upload ke Cloudinary
    const base64Data = buffer.toString('base64');
    const dataUri = `data:${contentType};base64,${base64Data}`;

    // Buat signature untuk authentication
    const timestamp = Math.floor(Date.now() / 1000);
    const signatureStr = `folder=${FOLDER}&public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
    const signature = crypto.createHash('sha1').update(signatureStr).digest('hex');

    const formData = new FormData();
    formData.append('file', dataUri);
    formData.append('folder', FOLDER);
    formData.append('public_id', publicId);
    formData.append('timestamp', timestamp.toString());
    formData.append('api_key', API_KEY);
    formData.append('signature', signature);
    // Optimize: auto quality, convert ke webp di CDN
    formData.append('quality', 'auto');
    formData.append('fetch_format', 'auto');

    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(30000),
      }
    );

    const uploadData = await uploadResponse.json();

    if (!uploadResponse.ok || uploadData.error) {
      stats.failed++;
      const errMsg = uploadData.error?.message || `Upload gagal: HTTP ${uploadResponse.status}`;
      console.log(`  ❌ Upload gagal: ${errMsg}`);
      return { success: false, error: errMsg, url: imageUrl };
    }

    // Gunakan secure_url (HTTPS, CDN)
    const cloudinaryUrl = uploadData.secure_url;
    
    stats.uploads++;
    stats.totalBytes += buffer.length;

    console.log(`  ✅ Uploaded: ${publicId} → ${(buffer.length / 1024).toFixed(1)} KB → ${cloudinaryUrl.substring(0, 60)}...`);

    return {
      success: true,
      localUrl: cloudinaryUrl,     // URL permanen Cloudinary
      cloudinaryUrl: cloudinaryUrl,
      publicId: publicId,
      cached: false,
      size: buffer.length,
      bytes: uploadData.bytes,
      format: uploadData.format,
      width: uploadData.width,
      height: uploadData.height,
    };

  } catch (error) {
    stats.failed++;
    return { success: false, error: error.message, url: imageUrl };
  }
}

// ── Check apakah gambar udah ada di Cloudinary ──
async function checkCloudinaryExists(publicId) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signatureStr = `public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
    const signature = crypto.createHash('sha1').update(signatureStr).digest('hex');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image/upload/${publicId}?api_key=${API_KEY}&timestamp=${timestamp}&signature=${signature}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (response.ok) {
      const data = await response.json();
      return data.secure_url;
    }
    return null;
  } catch {
    return null;
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
  const result = await uploadToCloudinary(imageUrl);

  // Kalau gagal karena duplicate (sudah ada), coba check
  if (!result.success && result.error?.includes('already exists')) {
    const publicId = generatePublicId(imageUrl);
    const existingUrl = await checkCloudinaryExists(publicId);
    if (existingUrl) {
      stats.cached++;
      return { success: true, localUrl: existingUrl, cloudinaryUrl: existingUrl, cached: true };
    }
  }

  return result;
}

// ── Health check ──
app.get('/health', async (req, res) => {
  const configured = isCloudinaryConfigured();
  
  let cloudStatus = 'not_configured';
  if (configured) {
    try {
      // Ping Cloudinary API
      const timestamp = Math.floor(Date.now() / 1000);
      const signatureStr = `timestamp=${timestamp}${API_SECRET}`;
      const signature = crypto.createHash('sha1').update(signatureStr).digest('hex');
      
      const pingResp = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/usage?api_key=${API_KEY}&timestamp=${timestamp}&signature=${signature}`,
        { signal: AbortSignal.timeout(5000) }
      );
      
      if (pingResp.ok) {
        const usage = await pingResp.json();
        const storageUsed = usage.storage?.usage || 0;
        const storageLimit = usage.storage?.limit || 0;
        const storagePercent = storageLimit > 0 ? ((storageUsed / storageLimit) * 100).toFixed(1) : '?';
        
        cloudStatus = `connected (${(storageUsed / 1024 / 1024).toFixed(1)} MB / ${(storageLimit / 1024 / 1024 / 1024).toFixed(1)} GB = ${storagePercent}%)`;
      } else {
        cloudStatus = 'error_auth';
      }
    } catch {
      cloudStatus = 'error_connection';
    }
  }

  res.json({
    status: configured ? 'ok' : 'not_configured',
    cloudinary: cloudStatus,
    cloudName: CLOUD_NAME || '(not set)',
    folder: FOLDER,
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
  
  // Upload paralel (max 3 concurrent biar gak kena rate limit)
  const results = [];
  const concurrency = 3;
  
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
  const configured = isCloudinaryConfigured();
  
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   🖼️  JB Image Server v2.0 (Cloudinary)  🖼️    ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Server: http://localhost:${PORT}                   ║`);
  console.log(`║  Cloud:  ${configured ? '✅ Configured' : '❌ NOT CONFIGURED'}                       ║`);
  console.log(`║  Cloud:  ${CLOUD_NAME || '(not set)'}                             ║`);
  console.log(`║  Folder: ${FOLDER}                                ║`);
  console.log('║                                                  ║');
  
  if (!configured) {
    console.log('║  ⚠️  Cloudinary belum dikonfigurasi!             ║');
    console.log('║  1. Copy .env.example jadi .env                  ║');
    console.log('║  2. Isi CLOUDINARY_CLOUD_NAME, API_KEY, SECRET   ║');
    console.log('║  3. Restart server                               ║');
    console.log('║                                                  ║');
  } else {
    console.log('║  ✅ Gambar di-upload ke Cloudinary                ║');
    console.log('║  ✅ URL permanen, laptop mati pun tetap bisa!    ║');
    console.log('║  ✅ Free tier: 25 GB storage                     ║');
    console.log('║                                                  ║');
  }
  
  console.log('║  Tekan Ctrl+C buat stop server                   ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
});
