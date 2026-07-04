/**
 * create-icons.js — Generate simple PNG icons for the Chrome Extension
 * Jalankan: node create-icons.js
 *
 * Bikin icon oranye (warna Shopee) di folder extension/icons/
 */

import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, "extension", "icons");

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// CRC32 untuk PNG chunks
function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type);
  const crcVal = crc32(Buffer.concat([typeB, data]));
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crcVal);
  return Buffer.concat([len, typeB, data, crcB]);
}

function createPNG(size, r, g, b) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0); // width
  ihdrData.writeUInt32BE(size, 4); // height
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type: RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = createChunk("IHDR", ihdrData);

  // IDAT chunk — pixel data with filter bytes
  const raw = [];
  const center = size / 2;
  const radius = size * 0.35;

  for (let y = 0; y < size; y++) {
    raw.push(0); // filter: none
    for (let x = 0; x < size; x++) {
      // Buat lingkaran oranye di tengah dengan background gelap
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Dalam lingkaran — warna Shopee oranye
        raw.push(r, g, b);
      } else {
        // Luar lingkaran — background gelap
        raw.push(26, 26, 46); // #1a1a2e
      }
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(raw));
  const idat = createChunk("IDAT", compressed);
  const iend = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

// Shopee orange: #EE4D2D = rgb(238, 77, 45)
console.log("🎨 Generate icons untuk JB Scraper Extension...");
for (const size of [16, 48, 128]) {
  const png = createPNG(size, 238, 77, 45);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`  ✅ icon${size}.png (${png.length} bytes)`);
}
console.log("\n✅ Icons selesai! Folder: extension/icons/");
