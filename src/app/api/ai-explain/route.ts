import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

// ─── BANK JAJANAN INDONESIA ───
const BANK_JAJANAN = `
BANK JAJANAN (pilih yang harganya ≤ harga produk, jangan sebut yang lebih mahal):
- 0-10rb: es teh 5rb, gorengan 2rb, ciki 2rb
- 10-25rb: seblak 15rb, kopi susu 18rb, ayam geprek 20rb, boba 22rb
- 25-50rb: mixue 25rb, mie gacoan 30rb, burger 35rb, rice bowl 40rb
- 50-100rb: starbucks 55rb, pizza 75rb, steak 85rb, ayce 99rb
- 100-300rb: nongkrong cafe 150rb, dinner 200rb, buffet 250rb
`;

// ─── PERSONA DEFINITIONS ───
interface Persona {
  name: string;
  description: string;
  emoji: string;
  rules: string;
}

function detectPersona(category: string): Persona {
  const cat = (category || "").toLowerCase();

  if (cat.includes("fashion") || cat.includes("beauty") || cat.includes("kosmetik") || cat.includes("skincare") || cat.includes("makeup")) {
    return {
      name: "bestie_centil",
      description: `Gen Z abis. Sapaan "Bestieee/Cil", emoji 😭✨💅🏻🛒, kata "auto", "literally", "cheat code", "nggak kaleng-kaleng".`,
      emoji: "😭✨💅🏻🛒",
      rules: "",
    };
  }
  if (cat.includes("home") || cat.includes("rumah") || cat.includes("dapur") || cat.includes("mainan") || cat.includes("anak")) {
    return {
      name: "emak_centil",
      description: `Centil keibuan. Sapaan "Bun/Say", emoji 💅🏻✨🏃‍♀️, kata "hemat waktu", "anak happy", "dompet aman".`,
      emoji: "💅🏻✨🏃‍♀️",
      rules: "",
    };
  }
  if (cat.includes("elektronik") || cat.includes("gaming") || cat.includes("gadget") || cat.includes("mobile")) {
    return {
      name: "bro_centil",
      description: `Centil 50%. Sapaan "Bro/Sis/Gan", emoji 🔥⚡🛒, kata "worth it parah", "nggak nyesel", "bass nendang". Bahas spek tapi bahasa tongkrongan.`,
      emoji: "🔥⚡🛒",
      rules: "",
    };
  }
  if (cat.includes("otomotif") || cat.includes("perkakas") || cat.includes("sparepart") || cat.includes("kelistrikan") || cat.includes("oli")) {
    return {
      name: "bapak_teknis",
      description: `NOL CENTIL. Sapaan "Gan/Bro", emoji MAXIMAL 1 (🔧 atau ⚙️), to the point, sebut ukuran/bahan/garansi.`,
      emoji: "🔧",
      rules: `BAPAK_TEKNIS: NOL emoji centil (DILARANG 😭✨💅🏻🛒). Hanya 1 emoji 🔧 atau ⚙️. Gaya tegas, informatif, seperti mekanik.`,
    };
  }
  return {
    name: "juragan_centil",
    description: `Centil versi cuan. Sapaan "Bos/Bestie juragan", emoji 💰📈💅🏻, kata "naikin omset", "harga pabrik", "literally cuan".`,
    emoji: "💰📈💅🏻",
    rules: "",
  };
}

// ─── TEMPLATE MANUAL (Layer 3 fallback — always works) ───
function generateTemplate(product: any, persona: Persona): { explanation: string; outfitTips: string } {
  const { title, price, rating, reviewCount, discountPercent, category, marketplace } = product;
  const isBapakTeknis = persona.name === "bapak_teknis";
  const harga = `Rp ${price.toLocaleString("id-ID")}`;
  const ratingStr = reviewCount > 0 ? `Rating ${rating} dari ${reviewCount.toLocaleString("id-ID")} review` : "masih fresh, bisa jadi first buyer";
  const diskonStr = discountPercent > 0 ? `Diskon ${discountPercent}%!` : "";

  if (isBapakTeknis) {
    return {
      explanation: `Gan, ${title.slice(0, 60)}. ${diskonStr} Harga ${harga}, ${ratingStr}. Cek link bawah 🔧`,
      outfitTips: "",
    };
  }

  const greeting = persona.name === "bestie_centil" ? "Bestieee" : persona.name === "emak_centil" ? "Bun" : persona.name === "bro_centil" ? "Bro" : "Bos";
  const emoji = persona.emoji.split(" ")[0];

  return {
    explanation: `${greeting} ${emoji} ${title.slice(0, 50)} ini worth it banget! ${diskonStr} Harga ${harga}, ${ratingStr}. Stok ghoib, buruan cek link bawah! ${emoji}`,
    outfitTips: "",
  };
}

// ─── BUILD PROMPT ───
function buildPrompt(product: any, persona: Persona): { system: string; user: string } {
  const isBapakTeknis = persona.name === "bapak_teknis";
  const harga = product.price.toLocaleString("id-ID");

  const system = `Kamu adalah "${persona.name}" — ${persona.description}

${BANK_JAJANAN}

Aturan:
1. Sapa khas persona + heboh masalah relate
2. Spill produk + 2 fitur utama paling nendang (dari nama produk saja, jangan karang)
3. Harga dibandingin dengan jajanan dari BANK JAJANAN di atas. PILIH yang harganya ≤ Rp ${harga}. Jangan sebut jajanan yang lebih mahal dari produk.
4. Data rating jujur. Kalau 0 review tulis "masih fresh, bisa jadi first buyer"
5. Urgensi FOMO: "stok ghoib", "diskon", "keburu habis"
6. CTA: "Cek link bawah" + 1 emoji${isBapakTeknis ? ' (hanya 🔧 atau ⚙️, DILARANG 😭✨💅🏻🛒)' : ''}
7. Max 90 kata
8. DILARANG: bohong, klaim medis, karang fitur yang tidak ada di data produk
9. Tulis dalam Bahasa Indonesia, teks biasa (tidak ada markdown)
${persona.rules ? persona.rules : ''}`;

  const userMessage = `Data produk:
- Nama: ${product.title}
- Harga: Rp ${harga}
- Rating: ${product.rating} (${product.reviewCount > 0 ? product.reviewCount.toLocaleString("id-ID") + " review" : "masih fresh, bisa jadi first buyer"})
- Diskon: ${product.discountPercent > 0 ? product.discountPercent + "%" : "tidak ada"}
- Terjual: ${product.soldCount > 0 ? product.soldCount.toLocaleString("id-ID") : "baru launching"}
- Marketplace: ${product.marketplace}
- Kategori: ${product.category}

Tulis sekarang:`;

  return { system, user: userMessage };
}

// ─── MAIN HANDLER ───
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

    // Auto-detect persona dari kategori
    const persona = detectPersona(product.category || "");
    const { system, user } = buildPrompt(product, persona);

    // === Layer 1: Groq Llama 4 ===
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
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
              { role: "system", content: system },
              { role: "user", content: user },
            ],
            max_tokens: 256,
            temperature: 0.4,
            top_p: 0.9,
          }),
        });

        if (groqResponse.ok) {
          const groqData = await groqResponse.json();
          const content: string | undefined = groqData.choices?.[0]?.message?.content;

          if (content && content.trim().length > 20) {
            return NextResponse.json({
              explanation: content.trim(),
              outfitTips: "",
              persona: persona.name,
              source: "groq",
            });
          }
        } else {
          console.error("[api/ai-explain] Groq error:", groqResponse.status);
        }
      } catch (groqErr) {
        console.error("[api/ai-explain] Groq exception:", groqErr);
      }
    }

    // === Layer 2: z-ai-web-dev-sdk ===
    try {
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();

      const completion = await zai.chat.completions.create({
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        thinking: { type: "disabled" },
      });

      const content = completion.choices[0]?.message?.content;

      if (content && content.trim().length > 20) {
        return NextResponse.json({
          explanation: content.trim(),
          outfitTips: "",
          persona: persona.name,
          source: "z-ai",
        });
      }
    } catch (zaiErr) {
      console.error("[api/ai-explain] z-ai exception:", zaiErr);
    }

    // === Layer 3: Template manual (always works) ===
    console.log("[api/ai-explain] Using template fallback");
    const template = generateTemplate(product, persona);
    return NextResponse.json({
      explanation: template.explanation,
      outfitTips: template.outfitTips,
      persona: persona.name,
      source: "template",
    });
  } catch (err) {
    console.error("[api/ai-explain] Error:", err);
    return NextResponse.json(
      { error: "Gagal menjelaskan produk" },
      { status: 500 }
    );
  }
}
