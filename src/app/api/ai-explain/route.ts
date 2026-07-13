import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // 30 detik — z-ai fallback butuh waktu lebih

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";

/**
 * POST /api/ai-explain
 *
 * AI Personal Stylist & Sales — menjelaskan produk + rekomendasi outfit pelengkap.
 * Menggunakan Groq + Llama 3.3 70B untuk respons super cepat.
 * Fallback ke z-ai-web-dev-sdk kalau GROQ_API_KEY belum di-set.
 *
 * Note: Sebelumnya pakai "meta-llama/llama-4-scout-17b-16e-instruct" tapi
 * model itu di-deprecated GroqCloud pada 17 Juli 2026. Pindah ke
 * "llama-3.3-70b-versatile" (stabil, cepat, tidak di-deprecated).
 *
 * Body: { product: { title, price, originalPrice, discountPercent, rating,
 *         reviewCount, soldCount, marketplace, category, location, isViral } }
 * Response: { explanation: string, outfitTips: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const product = body.product;

    if (!product?.title) {
      return NextResponse.json(
        { error: "Product title is required" },
        { status: 400 }
      );
    }

    const systemPrompt = `Kamu adalah "JB" — AI Personal Stylist & Sales dari JelajahBelanja. Kamu BUKAN sekedar reviewer, kamu seorang personal stylist yang PINTAR MENJUAL. Tujuanmu: bikin user beli PRODUK + OUTFIT PELANGKAP, bukan cuma 1 item.

Gaya bahasa kamu:
1. SANTAI & GEMES — pakai bahasa Indonesia sehari-hari, kayak ngobrol sama temen ("nih", "banget", "fyeuh", "gila sih", "cocok banget")
2. JUJUR tapi PERSUASIF — sebut kekurangan kecil, tapi selalu arahkan ke keputusan beli
3. FAKTA DULU — sebut data (rating, terjual, diskon) sebagai social proof
4. OUTFIT STYLING — WAJIB kasih rekomendasi outfit lengkap yang cocok dengan produk ini
5. CROSS-SELL NATURAL — rekomendasi pelengkap harus terasa natural, kayak temen yang ngasih saksi, bukan sales yang maksa

BAGIAN 1: REVIEW PRODUK (maks 120 kata)
- Greeting punchy 1 kalimat
- Kenapa produk ini worth it (2-3 poin dengan data)
- 1 kekurangan kecil (biar keliatan jujur)
- Verdict: "Worth it buat..."

BAGIAN 2: OUTFIT REKOMENDASI (maks 80 kata)
- Rekomendasikan 2-3 item pelengkap yang cocok dipadukan
- Contoh: kalau produk sepatu sneakers → rekomendasikan celana jeans/koel + kaos oversized/hoodie
- Sebutkan ESTIMASI HARGA range (mis. "celana jeans Rp 100-200rb" atau "hoodie Rp 150-250rb")
- Buat terasa kayak "outfit of the day" yang lagi trending
- WAJIB sebut "Lihat rekomendasi JB di bawah ya!" di akhir

PENTING:
- Tulis dalam Bahasa Indonesia
- Total maks 200 kata
- JANGAN pakai markdown formatting (##, **, *, dll) — tulis teks biasa saja
- Jangan tulis "sebagai AI"
- Jangan sebut brand spesifik (Nike, Adidas, dll) — cukup jenis item
- Rekomendasi outfit harus masuk akal & sesuai harga produk (kalau produk Rp 100rb, jangan rekomendasi item Rp 1jt)
- Pisahkan BAGIAN 1 dan BAGIAN 2 dengan baris kosong + "---" + baris kosong
- Maks 4 emoji total`;

    const priceInfo = product.originalPrice
      ? `Harga: Rp ${product.price.toLocaleString("id-ID")} (asli Rp ${product.originalPrice.toLocaleString("id-ID")}, diskon ${product.discountPercent}%)`
      : `Harga: Rp ${product.price.toLocaleString("id-ID")}`;

    const viralInfo = product.isViral ? "Produk ini VIRAL (masuk top 25% viral score)." : "";
    const soldInfo = product.soldCount ? `Terjual: ${product.soldCount.toLocaleString("id-ID")} unit.` : "";
    const ratingInfo = product.rating ? `Rating: ${product.rating}/5 dari ${product.reviewCount?.toLocaleString("id-ID") ?? "banyak"} review.` : "";
    const locationInfo = product.location ? `Lokasi seller: ${product.location}.` : "";

    const userMessage = `Jelaskan produk ini + kasih rekomendasi outfit pelengkap:

Nama: ${product.title}
Kategori: ${product.category}
Marketplace: ${product.marketplace}
${priceInfo}
${ratingInfo}
${soldInfo}
${locationInfo}
${viralInfo}

Ingat: jadiin personal stylist, bukan cuma reviewer! Rekomendasi outfit yang cocok + estimasi harga.`;

    // === Try Groq API (satu-satunya AI yang jalan di Vercel) ===
    // z-ai SDK hanya jalan di sandbox (pakai internal-api.z.ai), tidak di Vercel
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY belum di-set di Vercel env vars" },
        { status: 500 }
      );
    }

    let groqError = "";
    try {
      const groqResponse = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          max_tokens: 2048,
          temperature: 0.7,
          // GPT-OSS 120B: suppress reasoning supaya content langsung terisi
          reasoning_format: "hidden",
        }),
      });

      if (groqResponse.ok) {
        const groqData = await groqResponse.json();
        const msg = groqData.choices?.[0]?.message || {};
        // GPT-OSS 120B: content bisa kosong, text ada di "reasoning" field
        const fullResponse: string | undefined = msg.content || msg.reasoning || msg.reasoning_content || "";

        if (fullResponse && fullResponse.length > 10) {
          const separator = "---";
          const parts = fullResponse.split(separator);
          const explanation = parts[0]?.trim() || fullResponse;
          const outfitTips = parts[1]?.trim() || "";
          return NextResponse.json({ explanation, outfitTips });
        } else {
          groqError = "Empty content. Response: " + JSON.stringify(groqData).slice(0, 500);
        }
      } else {
        groqError = `Groq ${groqResponse.status}: ${await groqResponse.text()}`;
        console.error("[api/ai-explain] Groq API error:", groqError);
      }
    } catch (groqErr: any) {
      groqError = groqErr?.message || String(groqErr);
      console.error("[api/ai-explain] Groq fetch error:", groqError);
    }

    return NextResponse.json(
      { error: "Gagal menjelaskan produk", detail: groqError || "Groq API error", model: MODEL },
      { status: 500 }
    );

  } catch (err) {
    console.error("[api/ai-explain] Error:", err);
    return NextResponse.json(
      { error: "Gagal menjelaskan produk" },
      { status: 500 }
    );
  }
}
