import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";

function authCheck(req: NextRequest): NextResponse | null {
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${process.env.ADMIN_SECRET || "jelajahbelanja2024"}`) return null;
  const cookie = req.cookies.get("jb-admin-session")?.value;
  if (cookie) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * GET /api/blog-trending
 *
 * AI cari trending topik produk anak Indonesia → suggest 5 judul artikel fresh.
 * Pakai Groq API (GPT-OSS 120B) — punya knowledge cutoff terbaru + reasoning.
 */
export async function GET(req: NextRequest) {
  const authErr = authCheck(req);
  if (authErr) return authErr;

  try {
    // Cek artikel yang sudah ada di DB
    const existingArticles = await db.blogArticle.findMany({ select: { title: true } });
    const existingTitles = existingArticles.map(a => a.title.toLowerCase());
    const existingContext = existingTitles.join("; ").slice(0, 800);

    // Cek produk yang ada di DB (untuk konteks kategori)
    const productCount = await db.shopeeProduct.count({ where: { isHidden: false } });
    const categories = await db.category.findMany({
      where: { enabled: true },
      select: { name: true },
    });
    const categoryNames = categories.map(c => c.name).join(", ");

    // Current date untuk konteks
    const now = new Date();
    const monthYear = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

    // AI: analisis trending + suggest judul artikel
    const groqResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: `Anda adalah content strategist AI untuk JelajahBelanja — blog kurasi produk anak Indonesia (jelajahbelanja.com).

Tugas: cari topik trending produk anak di Indonesia untuk ${monthYear} dan suggest 5 judul artikel yang FRESH dan SEO-friendly.

Konteks JB:
- Niche: produk anak (fashion anak, tumbler, tas sekolah, mainan edukatif, kaos kaki, jepit rambut, sepatu anak, mukena anak)
- Marketplace: Shopee, Tokopedia, Lazada, Blibli, TikTok Shop
- Audience: ibu/ayah muda Indonesia (25-40 tahun)
- Kategori aktif: ${categoryNames}
- ${productCount} produk di database

Penting:
- Think about what's trending NOW: viral TikTok, seasonal (back to school, Lebaran, Natal), new product launches
- Judul harus SEO-friendly (orang cari di Google)
- First-mover: pilih topik yang BELUM banyak diblog orang lain
- Artikel harus relevan dengan produk yang dijual JB

Output: JSON array dengan 5 suggestions. HANYA JSON, tidak ada teks lain.
[
  {
    "title": "Judul Artikel",
    "category": "Review Produk|Tips Belanja|Tips Hemat|Trending",
    "prompt": "Prompt detail untuk AI generate artikel (deskripsikan apa yang harus ditulis, tone, struktur)",
    "reason": "Kenapa topik ini trending sekarang",
    "searchVolume": "Tinggi|Sedang|Rendah",
    "keyword": "Keyword SEO utama"
  }
]`,
          },
          {
            role: "user",
            content: `Bulan: ${monthYear}

Artikel yang SUDAH ada di JB (jangan duplikat):
${existingContext}

Suggest 5 judul artikel produk anak yang trending untuk ${monthYear}. 
Pikirkan: apa yang lagi viral di TikTok, apa yang orang cari di Google, 
musim/season yang relevan, dan produk baru yang menarik.

Jangan suggest topik yang sudah ada di list di atas.`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.8,
        reasoning_format: "hidden",
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      return NextResponse.json(
        { success: false, error: `Groq API ${groqResponse.status}`, detail: errText.slice(0, 300) },
        { status: 500 }
      );
    }

    const groqData = await groqResponse.json();
    const aiResponse = groqData.choices?.[0]?.message?.content || "";

    // Parse JSON
    let trending: any[] = [];
    try {
      trending = JSON.parse(aiResponse);
    } catch {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try { trending = JSON.parse(jsonMatch[0]); } catch {}
      }
    }

    if (!Array.isArray(trending) || trending.length === 0) {
      return NextResponse.json({
        success: false,
        error: "AI tidak return JSON valid",
        raw: aiResponse.slice(0, 500),
      });
    }

    // Filter duplikat
    const filtered = trending.filter((t: any) => {
      const titleLower = (t.title || "").toLowerCase();
      return !existingTitles.some(et => et === titleLower);
    });

    return NextResponse.json({
      success: true,
      month: monthYear,
      productCount,
      categories: categoryNames,
      existingArticles: existingTitles.length,
      trending: filtered,
    });
  } catch (err: any) {
    console.error("[api/blog-trending] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/blog-trending
 * Generate artikel dari trending suggestion.
 * Body: { "title": "...", "category": "...", "prompt": "..." }
 */
export async function POST(req: NextRequest) {
  const authErr = authCheck(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { title, category, prompt } = body;

    if (!title || !prompt) {
      return NextResponse.json({ error: "title dan prompt wajib diisi" }, { status: 400 });
    }

    // Forward ke blog-generate
    const blogRes = await fetch(`${req.nextUrl.origin}/api/blog-generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ADMIN_SECRET || "jelajahbelanja2024"}`,
      },
      body: JSON.stringify({ title, category, prompt }),
    });

    const blogData = await blogRes.json();
    return NextResponse.json(blogData, { status: blogRes.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
