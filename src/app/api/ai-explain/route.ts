import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai-explain
 *
 * AI Product Advisor — menjelaskan produk dengan gaya menarik
 * seperti seorang reviewer/influencer Indonesia.
 *
 * Body: { product: { title, price, originalPrice, discountPercent, rating,
 *         reviewCount, soldCount, marketplace, category, location, isViral } }
 * Response: { explanation: string }
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

    const zai = await ZAI.create();

    const systemPrompt = `Kamu adalah "JB" — AI Product Advisor dari JelajahBelanja, platform produk viral Indonesia. Kamu jelasin produk kayak seorang reviewer/influencer yang asik, friendly, dan jujur. Gaya bahasa kamu:

1. SANTAI & GEMES — pakai bahasa Indonesia sehari-hari, kayak ngobrol sama temen ("nih", "banget", "fyeuh", "gila sih")
2. JUJUR — kalau ada kekurangan, sebutin juga. Kalau diskonnya gede, hype-in. Kalau harganya mahal, kasih pertimbangan.
3. FAKTA DULU, OPINI KEDUA — selalu sebut data (rating, jumlah terjual, diskon) sebelum kasih opini
4. FUN FACTS — kalau produk ini viral di TikTok atau best seller, sebutin! Itu social proof penting.
5. PENUTUP SELALU REKOMENDASI — kasih kesimpulan "worth it atau nggak buat siapa"

FORMAT RESPONSE (pakai markdown):
- Mulai dengan greeting singkat (1 kalimat punchy)
- Jelaskan kenapa produk ini menarik (2-3 poin)
- Sebutkan kelebihan & potensi kekurangan
- Kasih verdict: "Worth it buat..." atau "Skip kalau..."
- Tutup dengan 1 kalimat CTA natural

PENTING:
- Tulis dalam Bahasa Indonesia
- Jangan terlalu panjang (maks 200 kata)
- Jangan pakai emoji berlebihan (maks 3-4 emoji total)
- Jangan tulis "sebagai AI" atau "saya adalah AI"
- Jangan tawarkan alternatif produk lain
- Fokus pada produk yang diberikan saja`;

    const priceInfo = product.originalPrice
      ? `Harga: Rp ${product.price.toLocaleString("id-ID")} (asli Rp ${product.originalPrice.toLocaleString("id-ID")}, diskon ${product.discountPercent}%)`
      : `Harga: Rp ${product.price.toLocaleString("id-ID")}`;

    const viralInfo = product.isViral ? "Produk ini VIRAL (masuk top 25% viral score)." : "";
    const soldInfo = product.soldCount ? `Terjual: ${product.soldCount.toLocaleString("id-ID")} unit.` : "";
    const ratingInfo = product.rating ? `Rating: ${product.rating}/5 dari ${product.reviewCount?.toLocaleString("id-ID") ?? "banyak"} review.` : "";
    const locationInfo = product.location ? `Lokasi seller: ${product.location}.` : "";

    const userMessage = `Jelaskan produk ini dengan gaya menarik:

Nama: ${product.title}
Kategori: ${product.category}
Marketplace: ${product.marketplace}
${priceInfo}
${ratingInfo}
${soldInfo}
${locationInfo}
${viralInfo}

Buat penjelasan yang bikin orang penasaran dan mau beli, tapi tetap jujur!`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      thinking: { type: "disabled" },
    });

    const explanation = completion.choices[0]?.message?.content;

    if (!explanation) {
      return NextResponse.json(
        { error: "AI tidak bisa menjelaskan produk ini" },
        { status: 500 }
      );
    }

    return NextResponse.json({ explanation });
  } catch (err) {
    console.error("[api/ai-explain] Error:", err);
    return NextResponse.json(
      { error: "Gagal menjelaskan produk" },
      { status: 500 }
    );
  }
}
