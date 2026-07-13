import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // 30 detik — z-ai fallback butuh waktu lebih

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

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

    // === Try Groq API first (Llama 4) ===
    const apiKey = process.env.GROQ_API_KEY;

    if (apiKey) {
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
          max_tokens: 512,
          temperature: 0.7,
          top_p: 0.9,
        }),
      });

      if (groqResponse.ok) {
        const groqData = await groqResponse.json();
        const fullResponse: string | undefined = groqData.choices?.[0]?.message?.content;

        if (fullResponse) {
          // Split response into review and outfit tips
          const separator = "---";
          const parts = fullResponse.split(separator);
          const explanation = parts[0]?.trim() || fullResponse;
          const outfitTips = parts[1]?.trim() || "";

          return NextResponse.json({ explanation, outfitTips });
        }
      } else {
        const errText = await groqResponse.text();
        console.error("[api/ai-explain] Groq API error:", groqResponse.status, errText);
        // Fall through to z-ai fallback
      }
    }

    // === Fallback: z-ai-web-dev-sdk ===
    console.log("[api/ai-explain] Falling back to z-ai-web-dev-sdk");
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const fullResponse = completion.choices[0]?.message?.content;

    if (!fullResponse) {
      return NextResponse.json(
        { error: "AI tidak bisa menjelaskan produk ini" },
        { status: 500 }
      );
    }

    const separator = "---";
    const parts = fullResponse.split(separator);
    const explanation = parts[0]?.trim() || fullResponse;
    const outfitTips = parts[1]?.trim() || "";

    return NextResponse.json({ explanation, outfitTips });
  } catch (err) {
    console.error("[api/ai-explain] Error:", err);
    return NextResponse.json(
      { error: "Gagal menjelaskan produk" },
      { status: 500 }
    );
  }
}
