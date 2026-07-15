# JB Image Proxy — Cara Install

## Masalah
Tokopedia (dan kadang Shopee) blokir hotlinking gambar, jadi gambar produk gak kelihatan di website JB.

## Solusi
Tambahin **image proxy** di website JB — gambar di-download dari server JB sendiri, bukan langsung dari Tokopedia.

---

## Cara Install (5 menit)

### Step 1: Copy API route ke project JB

```
cp route.ts  →  app/api/image-proxy/route.ts
```

Kalau mau pakai Vercel Blob (permanent cache, recommended):
```
cp route-with-blob.ts  →  app/api/image-proxy/route.ts
npm install @vercel/blob
```

### Step 2: Set environment variable (kalau pakai Vercel Blob)

Di Vercel Dashboard → Settings → Environment Variables:
```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
```
(Token otomatis dibuat kalau kamu install @vercel/blob dan deploy)

### Step 3: Update komponen gambar

Di halaman yang nampilin produk, ganti:

**Sebelum:**
```tsx
<img src={product.image} alt={product.title} />
```

**Sesudah:**
```tsx
import { getProxiedImageUrl } from "@/components/ProductImage";

<img src={getProxiedImageUrl(product.image)} alt={product.title} />
```

Atau pakai component yang udah disediain:
```tsx
import { ProductImg } from "@/components/ProductImage";

<ProductImg src={product.image} alt={product.title} />
```

### Step 4: Deploy

```bash
git add .
git commit -m "add image proxy for Tokopedia/Shopee"
git push
```

---

## Cara Kerja

1. Gambar Tokopedia: `https://cbn.net/img/xxx.jpg`
2. Di-convert jadi: `/api/image-proxy?url=https%3A%2F%2Fcbn.net%2Fimg%2Fxxx.jpg`
3. Server JB download gambar dari Tokopedia (pakai browser headers)
4. Serve gambar ke client → gambar kelihatan!
5. Kalau pakai Vercel Blob: gambar di-cache permanent, gak re-download lagi

---

## Security

- Hanya domain yang di-allowlist yang bisa di-proxy (Shopee, Tokopedia, AT CDN)
- Tambah domain baru di array `ALLOWED_DOMAINS` di route.ts
- Rate limit bawaan dari Vercel (serverless function timeout)

## Testing

Setelah deploy, coba akses:
```
https://jelajahbelanja.vercel.app/api/image-proxy?url=https://down-id.img.susercontent.com/file/sg-11134201-7rdyb-ljx4nm5g0y8v85
```

Kalau keluar gambar = berhasil!
