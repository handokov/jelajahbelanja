/**
 * JB Image Server — v1.0
 * 
 * Simpan gambar produk Tokopedia/Shopee di lokal supaya URL-nya stabil.
 * Tokopedia suka ganti/hapus URL gambar, jadi kita download & simpan sendiri.
 * 
 * Cara pakai:
 *   1. npm install
 *   2. node server.js   (atau double-click start.bat)
 *   3. Server jalan di http://localhost:3000
 * 
 * Endpoint:
 *   POST /download?url=<image_url>   → Download gambar & simpan lokal
 *   GET  /images/<filename>           → Serve gambar yang udah disimpan
 *   GET  /list                        → List semua gambar yang udah disimpan
 *   GET  /health                      → Cek server hidup atau gak
 *   POST /batch                       → Download banyak gambar sekaligus
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const IMAGES_DIR = path.join(__dirname, 'images');

// Pastikan folder images ada
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Parse JSON body
app.use(express.json());

// Serve static images dengan CORS header
app.use('/images', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Cache-Control', 'public, max-age=86400'); // Cache 24 jam
  next();
}, express.static(IMAGES_DIR));

// ── Health check ──
app.get('/health', (req, res) => {
  const files = fs.readdirSync(IMAGES_DIR).filter(f => 
    f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png') || f.endsWith('.webp')
  );
  res.json({ 
    status: 'ok', 
    images: files.length,
    port: PORT,
    message: 'JB Image Server jalan! 🚀' 
  });
});

// ── List semua gambar ──
app.get('/list', (req, res) => {
  const files = fs.readdirSync(IMAGES_DIR).filter(f => 
    f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png') || f.endsWith('.webp')
  );
  
  const imageList = files.map(f => ({
    filename: f,
    url: `http://localhost:${PORT}/images/${f}`,
    size: fs.statSync(path.join(IMAGES_DIR, f)).size,
  }));
  
  res.json({ count: imageList.length, images: imageList });
});

// ── Generate filename dari URL ──
function generateFilename(url) {
  // Coba ambil filename asli dari URL
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1] || '';
    
    // Kalau ada nama file yang valid
    if (lastPart && lastPart.length > 5) {
      // Bersihin nama file
      let cleanName = lastPart
        .replace(/[?#].*$/, '')           // Buang query string
        .replace(/[^a-zA-Z0-9._-]/g, '_'); // Buang karakter aneh
      
      // Tambah hash pendek supaya unik
      const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
      const ext = path.extname(cleanName) || '.jpg';
      const baseName = path.basename(cleanName, ext).substring(0, 40);
      
      return `${baseName}_${hash}${ext}`;
    }
  } catch {}
  
  // Fallback: hash URL
  const hash = crypto.createHash('md5').update(url).digest('hex');
  return `${hash}.jpg`;
}

// ── Download gambar dari URL ──
async function downloadImage(imageUrl) {
  const filename = generateFilename(imageUrl);
  const filepath = path.join(IMAGES_DIR, filename);
  
  // Kalau file udah ada, langsung return URL lokal
  if (fs.existsSync(filepath)) {
    const stats = fs.statSync(filepath);
    if (stats.size > 100) { // Minimal 100 bytes (bukan file kosong)
      return {
        success: true,
        localUrl: `http://localhost:${PORT}/images/${filename}`,
        filename,
        cached: true,
        size: stats.size,
      };
    }
  }
  
  try {
    // Download gambar dengan headers kayak browser
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': new URL(imageUrl).origin + '/',
      },
      signal: AbortSignal.timeout(15000), // 15 detik timeout
    });
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}`, url: imageUrl };
    }
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Cek apakah beneran gambar (minimal 100 bytes)
    if (buffer.length < 100) {
      return { success: false, error: 'File terlalu kecil (bukan gambar)', url: imageUrl };
    }
    
    // Tentukan extension berdasarkan content-type
    let ext = '.jpg';
    if (contentType.includes('png')) ext = '.png';
    else if (contentType.includes('webp')) ext = '.webp';
    else if (contentType.includes('jpeg')) ext = '.jpg';
    
    // Update filename dengan extension yang bener
    const currentExt = path.extname(filename);
    let finalFilename = filename;
    if (ext !== currentExt && currentExt === '.jpg' && ext !== '.jpg') {
      finalFilename = path.basename(filename, currentExt) + ext;
    }
    const finalPath = path.join(IMAGES_DIR, finalFilename);
    
    // Simpan file
    fs.writeFileSync(finalPath, buffer);
    
    return {
      success: true,
      localUrl: `http://localhost:${PORT}/images/${finalFilename}`,
      filename: finalFilename,
      cached: false,
      size: buffer.length,
      contentType,
    };
  } catch (error) {
    return { success: false, error: error.message, url: imageUrl };
  }
}

// ── POST /download?url=<image_url> ──
// Dipakai sama extension buat download 1 gambar
app.post('/download', async (req, res) => {
  const imageUrl = req.query.url || req.body?.url;
  
  if (!imageUrl) {
    return res.status(400).json({ error: 'Parameter url diperlukan. Pakai ?url=... atau body { url: "..." }' });
  }
  
  console.log(`📥 Download: ${imageUrl.substring(0, 80)}...`);
  const result = await downloadImage(imageUrl);
  
  if (result.success) {
    console.log(`✅ Saved: ${result.filename} (${(result.size / 1024).toFixed(1)} KB)${result.cached ? ' [cached]' : ''}`);
  } else {
    console.log(`❌ Failed: ${result.error}`);
  }
  
  res.json(result);
});

// ── POST /batch ──
// Download banyak gambar sekaligus
app.post('/batch', async (req, res) => {
  const { urls } = req.body;
  
  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'Body harus berisi { urls: ["url1", "url2", ...] }' });
  }
  
  if (urls.length > 50) {
    return res.status(400).json({ error: 'Maksimal 50 URL per request' });
  }
  
  console.log(`📥 Batch download: ${urls.length} gambar`);
  
  // Download semua secara paralel (max 5 concurrent)
  const results = [];
  const concurrency = 5;
  
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(url => downloadImage(url)));
    results.push(...batchResults);
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

// ── DELETE /images/<filename> ──
// Hapus gambar tertentu
app.delete('/images/:filename', (req, res) => {
  const filepath = path.join(IMAGES_DIR, req.params.filename);
  
  // Security: pastikan file ada di folder images (no path traversal)
  if (!filepath.startsWith(IMAGES_DIR)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'File tidak ditemukan' });
  }
  
  fs.unlinkSync(filepath);
  console.log(`🗑️ Deleted: ${req.params.filename}`);
  res.json({ success: true, deleted: req.params.filename });
});

// ── DELETE /clear ──
// Hapus semua gambar
app.delete('/clear', (req, res) => {
  const files = fs.readdirSync(IMAGES_DIR).filter(f => 
    f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png') || f.endsWith('.webp')
  );
  
  for (const f of files) {
    fs.unlinkSync(path.join(IMAGES_DIR, f));
  }
  
  console.log(`🗑️ Cleared ${files.length} images`);
  res.json({ success: true, deleted: files.length });
});

// ── Start server ──
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     🖼️  JB Image Server v1.0  🖼️           ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  Server: http://localhost:${PORT}               ║`);
  console.log(`║  Images: http://localhost:${PORT}/images/       ║`);
  console.log('║  Health: http://localhost:3000/health        ║');
  console.log('║                                              ║');
  console.log('║  Cara pakai dari extension:                  ║');
  console.log('║  POST /download?url=<gambar_url>             ║');
  console.log('║                                              ║');
  console.log('║  Tekan Ctrl+C buat stop server               ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
});
