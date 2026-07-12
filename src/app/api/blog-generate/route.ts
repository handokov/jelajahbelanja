import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // 2 menit

/**
 * POST /api/blog-generate
 *
 * Generate 1 artikel blog baru via AI (z-ai-web-dev-sdk).
 * Bisa specify topic via body, atau random kalau tidak di-specify.
 *
 * Protected by admin auth (jb-admin-session cookie).
 *
 * Body (optional):
 *   { "title": "...", "category": "...", "prompt": "..." }
 * Kalau body kosong, pilih topik random dari daftar.
 */
export async function POST(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    // Daftar topik default (sama dengan cron/blog-generate)
    const defaultTopics = [
      {
        title: "10 Produk Fashion Viral TikTok yang Worth It Beli",
        category: "Review Produk",
        prompt: "Tulis artikel blog bahasa Indonesia tentang 10 produk fashion yang viral di TikTok Indonesia 2025. Format HTML dengan heading h2, paragraf p, list ul/li. Sertakan tips memilih fashion viral yang berkualitas. Tone: santai, informatif, seperti influencer Indonesia.",
      },
      {
        title: "Cara Dapat Diskon Shopee Hingga 70% yang Sering Terlewat",
        category: "Tips Hemat",
        prompt: "Tulis artikel blog bahasa Indonesia tentang rahasia mendapat diskon Shopee hingga 70%. Bahas voucher tersembunyi, flash sale, cashback, gratis ongkir. Format HTML dengan h2, p, ul/li. Tone: praktis, langsung ke poin.",
      },
      {
        title: "Produk Elektronik Termurah di Tokopedia 2025",
        category: "Tips Belanja",
        prompt: "Tulis artikel blog bahasa Indonesia tentang 10 produk elektronik termurah dan berkualitas di Tokopedia 2025. Format HTML dengan h2, p, ul/li. Bahas earbuds, powerbank, smartwatch, dll. Tone: informatif, santai.",
      },
      {
        title: "Skincare Viral yang Beneran Bagus — Review Jujur",
        category: "Review Produk",
        prompt: "Tulis artikel blog bahasa Indonesia review 8 produk skincare viral di TikTok/Instagram yang beneran bagus. Format HTML dengan h2, p, ul/li. Bahas sunscreen, serum, moisturizer. Tone: jujur, seperti sahabat yang kasih saran.",
      },
      {
        title: "Tips Belanja Online Aman untuk Pemula 2025",
        category: "Tips Belanja",
        prompt: "Tulis artikel blog bahasa Indonesia tentang tips belanja online aman untuk pemula di marketplace Indonesia (Shopee, Tokopedia, Lazada). Format HTML dengan h2, p, ul/li. Bahas cek rating toko, bedakan original vs kw, cara klaim garansi. Tone: edukatif, mudah dipahami.",
      },
      {
        title: "Produk Home Living Estetik di Bawah Rp100rb",
        category: "Tips Hemat",
        prompt: "Tulis artikel blog bahasa Indonesia tentang 10 produk home living estetik di bawah Rp100rb dari marketplace Indonesia. Format HTML dengan h2, p, ul/li. Bahas dekorasi, organizer, lampu, dll. Tone: inspiratif, cozy.",
      },
      {
        title: "Perbedaan Shopee, Tokopedia, dan Lazada — Mana yang Terbaik?",
        category: "Tips Belanja",
        prompt: "Tulis artikel blog bahasa Indonesia membandingkan Shopee vs Tokopedia vs Lazada. Bahas kelebihan, kekurangan, promo, pengiriman, dll. Format HTML dengan h2, p, ul/li, table. Tone: objektif, informatif.",
      },
      {
        title: "Cara Daftar Affiliate Shopee untuk Pemula",
        category: "Affiliate Guide",
        prompt: "Tulis artikel blog bahasa Indonesia tentang cara daftar Shopee Affiliate untuk pemula. Bahas syarat, cara daftar, tips dapat komisi. Format HTML dengan h2, p, ol/li. Tone: praktis, langkah demi langkah.",
      },
      {
        title: "10 Produk Viral TikTok yang Worth It Beli 2025",
        category: "Review Produk",
        prompt: "Tulis artikel blog bahasa Indonesia tentang 10 produk viral TikTok 2025 yang worth it dibeli. Bahas berbagai kategori: fashion, beauty, elektronik, home. Format HTML dengan h2, p, ul/li. Tone: santai, review jujur.",
      },
      {
        title: "Rahasia Gratis Ongkir Shopee & Tokopedia Tanpa Minimum Belanja",
        category: "Tips Hemat",
        prompt: "Tulis artikel blog bahasa Indonesia tentang rahasia gratis ongkir Shopee dan Tokopedia tanpa minimum belanja. Bahas voucher, program gratis ongkir, tips kombinasi. Format HTML dengan h2, p, ul/li. Tone: praktis.",
      },
      {
        title: "Produk Murah Meriah di Bawah Rp20rb yang Worth It",
        category: "Tips Hemat",
        prompt: "Tulis artikel blog bahasa Indonesia tentang 15 produk murah meriah di bawah Rp20rb yang worth it beli dari marketplace Indonesia. Format HTML dengan h2, p, ul/li. Bahas aksesoris, alat tulis, kebutuhan rumah. Tone: fun, hemat.",
      },
      {
        title: "Cara Pilih Produk Viral yang Beneran Bagus (Bukan Cuma Hype)",
        category: "Tips Belanja",
        prompt: "Tulis artikel blog bahasa Indonesia tentang cara memilih produk viral di TikTok/Instagram yang beneran bagus, bukan cuma hype. Bahas cek review, rating, seller, dll. Format HTML dengan h2, p, ul/li. Tone: edukatif, kritis.",
      },
    ];

    // Parse body (optional — kalau ada, pakai custom topic)
    let topic;
    try {
      const body = await req.json();
      if (body.title && body.prompt) {
        topic = {
          title: body.title,
          category: body.category || "Tips Belanja",
          prompt: body.prompt,
        };
      }
    } catch {
      // Body kosong / invalid JSON → pakai random topic
    }

    if (!topic) {
      // Pilih topik yang BELUM ada di DB (supaya tidak duplikat)
      const existingSlugs = await db.blogArticle.findMany({ select: { title: true } });
      const existingTitles = new Set(existingSlugs.map(a => a.title));

      const availableTopics = defaultTopics.filter(t => !existingTitles.has(t.title));
      const pool = availableTopics.length > 0 ? availableTopics : defaultTopics;

      topic = pool[Math.floor(Math.random() * pool.length)];
    }

    // Generate slug dari title
    const slug = topic.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);

    // Cek apakah slug sudah ada
    const existing = await db.blogArticle.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Artikel dengan slug "${slug}" sudah ada. Coba judul lain.` },
        { status: 409 }
      );
    }

    // Generate content via z-ai-web-dev-sdk
    let content = "";
    let excerpt = "";
    let metaDescription = "";
    let tags = "";
    let readTime = "5 menit";

    try {
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();

      // Generate article content
      const response = await zai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "Anda adalah penulis blog Indonesia yang ahli dalam tips belanja online, review produk, dan gaya hidup. Tulis dalam bahasa Indonesia yang natural, santai, dan informatif. Format output sebagai HTML yang siap ditampilkan (h2, p, ul, li, strong).",
          },
          {
            role: "user",
            content: `${topic.prompt}\n\nJudul artikel: ${topic.title}\n\nTulis artikel lengkap (minimal 800 kata) dalam format HTML. Mulai dengan paragraf pembuka yang menarik, lalu isi dengan sub-heading (h2), dan tutup dengan kesimpulan.`,
          },
        ],
      });

      content = response.choices[0]?.message?.content || "";

      // Generate excerpt
      const excerptResponse = await zai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "Anda adalah asisten yang membuat ringkasan artikel. Tulis ringkasan 1-2 kalimat dalam bahasa Indonesia.",
          },
          {
            role: "user",
            content: `Buat ringkasan singkat (1 kalimat, max 150 karakter) untuk artikel berjudul: ${topic.title}`,
          },
        ],
      });
      excerpt = excerptResponse.choices[0]?.message?.content?.slice(0, 200) || topic.title;

      metaDescription = excerpt.slice(0, 160);

      // Generate tags
      const tagsResponse = await zai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "Anda adalah asisten SEO. Berikan 5 tag relevan dalam bahasa Indonesia, dipisah koma.",
          },
          {
            role: "user",
            content: `Berikan 5 tag SEO untuk artikel berjudul: ${topic.title}`,
          },
        ],
      });
      tags = tagsResponse.choices[0]?.message?.content || "";

      // Estimate read time (200 words per minute)
      const wordCount = content.split(/\s+/).length;
      readTime = `${Math.max(3, Math.ceil(wordCount / 200))} menit`;
    } catch (aiErr: any) {
      console.error("[api/blog-generate] AI error:", aiErr);
      // Fallback: pakai template content sederhana
      content = `<h2>Pendahuluan</h2><p>${topic.title}. Artikel ini akan membahas tips dan trik yang berguna untuk Anda.</p><h2>Tips Utama</h2><ul><li>Selalu cek rating toko sebelum beli</li><li>Bandngkan harga di beberapa marketplace</li><li>Manfaatkan voucher dan cashback</li><li>Baca review dari pembeli lain</li></ul><h2>Kesimpulan</h2><p>Belanja online bisa jadi pengalaman yang menyenangkan jika Anda tahu caranya. Semoga tips di artikel ini bermanfaat!</p>`;
      excerpt = topic.title;
      metaDescription = topic.title;
      tags = topic.category;
    }

    // Save to DB
    const article = await db.blogArticle.create({
      data: {
        slug,
        title: topic.title,
        excerpt,
        category: topic.category,
        readTime,
        author: "Tim JelajahBelanja",
        tags,
        metaDescription,
        content,
        isPublished: true,
        isAiGenerated: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Article generated successfully",
      article: {
        id: article.id,
        slug: article.slug,
        title: article.title,
        category: article.category,
        readTime: article.readTime,
        excerpt: article.excerpt,
        url: `/artikel/${article.slug}`,
      },
    });
  } catch (err: any) {
    console.error("[api/blog-generate] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * GET /api/blog-generate — list available topics (untuk preview di admin UI)
 */
export async function GET(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  try {
    const articles = await db.blogArticle.findMany({
      select: { title: true, slug: true, category: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      totalArticles: articles.length,
      articles,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
