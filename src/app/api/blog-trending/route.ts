import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAuth } from "@/lib/admin-auth";

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
 * Cari trending topik produk anak di Google + marketplace Indonesia.
 * AI analisis → suggest 5 judul artikel yang fresh (belum pernah diblog lain).
 *
 * Response: { success, trending: [{ title, category, prompt, reason, searchVolume }] }
 */
export async function GET(req: NextRequest) {
  const authErr = authCheck(req);
  if (authErr) return authErr;

  try {
    // Step 1: Search trending produk anak di Google via z-ai web_search
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    // Multiple search queries untuk dapat trending terbaru
    const searchQueries = [
      "produk anak viral TikTok Indonesia 2026",
      "trending belanja produk anak Shopee Tokopedia 2026",
      "produk bayi dan anak terlaris marketplace Indonesia 2026",
      "fashion anak tren terbaru 2026 Indonesia",
    ];

    interface SearchResult {
      url: string;
      name: string;
      snippet: string;
      host_name: string;
      date: string;
    }

    const allResults: SearchResult[] = [];
    for (const query of searchQueries) {
      try {
        const results = await zai.functions.invoke("web_search", { query, num: 10 });
        if (Array.isArray(results)) {
          allResults.push(...results);
        }
      } catch {}
    }

    // Step 2: Cek artikel yang sudah ada di DB (supaya tidak duplikat)
    const existingArticles = await db.blogArticle.findMany({ select: { title: true } });
    const existingTitles = existingArticles.map(a => a.title.toLowerCase());

    // Step 3: AI analisis trending → suggest 5 judul artikel fresh
    const searchContext = allResults
      .slice(0, 30)
      .map((r, i) => `${i + 1}. ${r.name}\n   ${r.snippet?.slice(0, 120)}`)
      .join("\n");

    const existingContext = existingTitles.join("; ").slice(0, 500);

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
            content: `Anda adalah content strategist untuk JelajahBelanja — blog kurasi produk anak Indonesia. Tugas: analisis data trending dan suggest 5 judul artikel yang FRESH, SEO-friendly, dan belum pernah diblog orang lain.

Penting:
- Artikel harus tentang produk anak (fashion anak, tumbler, tas sekolah, mainan edukatif, kaos kaki, jepit rambut, sepatu anak, mukena anak, dll)
- Judul harus menarik clickbait tapi jujur (tidak menyesatkan)
- Sertakan tahun 2026 jika relevan
- Bahasa Indonesia
- Format: JSON array dengan field: title, category, prompt, reason, searchVolume

Category options: "Review Produk", "Tips Belanja", "Tips Hemat", "Trending"

Output HANYA JSON, tidak ada penjelasan lain.`,
          },
          {
            role: "user",
            content: `Data trending dari Google & marketplace Indonesia:

${searchContext}

Artikel yang SUDAH ada di JB (jangan duplikat):
${existingContext}

Berdasarkan data trending di atas, suggest 5 judul artikel produk anak yang:
1. Lagi trending/viral sekarang
2. Belum pernah diblog JB
3. Potensi SEO tinggi (orang cari di Google)
4. First-mover advantage (belum banyak blog yang bahas)

Output format: JSON array
[
  {
    "title": "Judul Artikel Menarik",
    "category": "Review Produk",
    "prompt": "Prompt detail untuk AI generate artikel ini",
    "reason": "Kenapa topik ini trending",
    "searchVolume": "Estimasi tingkat pencarian: Tinggi/Sedang/Rendah"
  },
  ...5 items
]`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.7,
        reasoning_format: "hidden",
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      return NextResponse.json(
        { success: false, error: `Groq API error: ${groqResponse.status}`, detail: errText.slice(0, 200) },
        { status: 500 }
      );
    }

    const groqData = await groqResponse.json();
    const aiResponse = groqData.choices?.[0]?.message?.content || "";

    // Parse JSON dari AI response
    let trending: any[] = [];
    try {
      // Coba parse langsung
      trending = JSON.parse(aiResponse);
    } catch {
      // Coba extract JSON dari text
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          trending = JSON.parse(jsonMatch[0]);
        } catch {
          return NextResponse.json({
            success: false,
            error: "AI response bukan JSON valid",
            raw: aiResponse.slice(0, 500),
          });
        }
      } else {
        return NextResponse.json({
          success: false,
          error: "AI response tidak ada JSON",
          raw: aiResponse.slice(0, 500),
        });
      }
    }

    // Filter: pastikan belum ada di DB
    const filteredTrending = trending.filter((t: any) => {
      const titleLower = (t.title || "").toLowerCase();
      return !existingTitles.some(et => et.includes(titleLower) || titleLower.includes(et));
    });

    return NextResponse.json({
      success: true,
      totalSearchResults: allResults.length,
      existingArticles: existingTitles.length,
      trending: filteredTrending,
    });
  } catch (err: any) {
    console.error("[api/blog-trending] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/blog-trending
 *
 * Generate artikel berdasarkan trending suggestion.
 * Body: { "title": "...", "category": "...", "prompt": "..." }
 * → Call /api/blog-generate dengan topic dari trending
 */
export async function POST(req: NextRequest) {
  const authErr = authCheck(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { title, category, prompt } = body;

    if (!title || !prompt) {
      return NextResponse.json(
        { error: "title dan prompt wajib diisi" },
        { status: 400 }
      );
    }

    // Forward ke blog-generate API
    const blogRes = await fetch(`${req.nextUrl.origin}/api/blog-generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ADMIN_SECRET || "jelajahbelanja2024"}`,
      },
      body: JSON.stringify({ title, category, prompt }),
    });

    const blogData = await blogRes.json();

    if (!blogData.success) {
      return NextResponse.json(blogData, { status: blogRes.status });
    }

    return NextResponse.json({
      success: true,
      message: "Artikel trending berhasil di-generate!",
      article: blogData.article,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
