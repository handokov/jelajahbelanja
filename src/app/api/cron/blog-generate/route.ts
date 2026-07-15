import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // 2 menit

/**
 * GET /api/cron/blog-generate
 *
 * Cron job yang di-generate Vercel tiap tanggal 1 setiap bulan.
 * Generate 1 artikel blog baru via AI (z-ai-web-dev-sdk).
 *
 * Protected by CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Pilih topik random dari daftar
    const topics = [
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
    ];

    // Pilih topik berdasarkan bulan (rotasi)
    const month = new Date().getMonth(); // 0-11
    const topic = topics[month % topics.length];

    // Generate slug dari title
    const slug = topic.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);

    // Cek apakah slug sudah ada
    const existing = await db.blogArticle.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Article with this slug already exists, skip generation",
        slug,
      });
    }

    // Generate content via Groq API (GPT-OSS 120B) — jalan di Vercel
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
    const MODEL = "openai/gpt-oss-120b";

    let content = "";
    let excerpt = "";
    let metaDescription = "";
    let tags = "";
    let readTime = "5 menit";

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: "GROQ_API_KEY not set" }, { status: 500 });
    }

    try {
      // Generate article content via Groq
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
              content: "Anda adalah jurnalis dan penulis blog Indonesia yang ahli dalam tips belanja online produk anak, review produk, dan gaya hidup keluarga. Tulis dalam bahasa Indonesia yang natural, santai, informatif, dan seperti ditulis manusia sungguhan. Format output sebagai HTML (h2, p, ul, li, strong). JANGAN pakai markdown.",
            },
            {
              role: "user",
              content: `${topic.prompt}\n\nJudul artikel: ${topic.title}\n\nTulis artikel lengkap (minimal 1000 kata) dalam format HTML. Mulai dengan paragraf pembuka yang menarik, lalu isi dengan 4-5 sub-heading (h2), dan tutup dengan kesimpulan.`,
            },
          ],
          max_tokens: 4096,
          temperature: 0.8,
          reasoning_format: "hidden",
        }),
      });

      if (groqResponse.ok) {
        const groqData = await groqResponse.json();
        content = groqData.choices?.[0]?.message?.content || "";
      } else {
        throw new Error(`Groq API ${groqResponse.status}`);
      }

      // Generate excerpt via Groq
      const excerptResponse = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: "Buat ringkasan 1 kalimat menarik dalam bahasa Indonesia, max 150 karakter." },
            { role: "user", content: `Ringkasan untuk artikel: ${topic.title}` },
          ],
          max_tokens: 200, temperature: 0.5, reasoning_format: "hidden",
        }),
      });
      if (excerptResponse.ok) {
        const exData = await excerptResponse.json();
        excerpt = exData.choices?.[0]?.message?.content?.slice(0, 200) || topic.title;
      } else { excerpt = topic.title; }

      metaDescription = excerpt.slice(0, 160);

      // Generate tags via Groq
      const tagsResponse = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: "Berikan 5 tag SEO relevan dalam bahasa Indonesia, dipisah koma." },
            { role: "user", content: `Tag untuk artikel: ${topic.title}` },
          ],
          max_tokens: 100, temperature: 0.3, reasoning_format: "hidden",
        }),
      });
      if (tagsResponse.ok) {
        const tagData = await tagsResponse.json();
        tags = tagData.choices?.[0]?.message?.content || topic.category;
      } else { tags = topic.category; }

      // Estimate read time (200 words per minute)
      const wordCount = content.split(/\s+/).length;
      readTime = `${Math.max(3, Math.ceil(wordCount / 200))} menit`;
    } catch (aiErr: any) {
      console.error("[cron/blog-generate] AI error:", aiErr);
      return NextResponse.json({ error: "Gagal generate AI: " + (aiErr.message || "unknown") }, { status: 500 });
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
      },
    });
  } catch (err: any) {
    console.error("[cron/blog-generate] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
