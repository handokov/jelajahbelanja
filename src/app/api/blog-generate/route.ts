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
    // Default topics — FOKUS PRODUK ANAK
    const defaultTopics = [
      {
        title: "10 Tumbler Anak Anti Tumpah Terbaik 2026 — Review Lengkap",
        category: "Review Produk",
        prompt: "Tulis artikel review 10 tumbler/botol minum anak anti tumpah terbaik. Bahas bahan (BPA free, stainless steel, plastik food grade), sedotan anti tumpah, ukuran, harga, dan rekomendasi per usia anak. Sertakan tips memilih tumbler yang aman untuk balita.",
      },
      {
        title: "Cara Memilih Kaos Kaki Sekolah Anak yang Nyaman dan Tahan Lama",
        category: "Tips Belanja",
        prompt: "Tulis artikel panduan memilih kaos kaki sekolah anak SD/SMP/SMA. Bahas bahan (katun, spandex, bamboo), ketebalan, ukuran, tips agar tidak mudah berlubang, dan merekomendasikan 5 produk terbaik dengan rating tinggi.",
      },
      {
        title: "10 Jepit Rambut Anak Korea yang Viral di TikTok 2026",
        category: "Review Produk",
        prompt: "Tulis artikel review 10 jepit rambut anak model Korea yang lagi viral di TikTok. Bahas bahan, daya rekat, apakah bikin sakit kepala atau tidak, harga, dan rekomendasi untuk anak perempuan usia 3-10 tahun.",
      },
      {
        title: "Tips Belanja Baju Anak Online — Hindari Kecewa dengan 7 Tips Ini",
        category: "Tips Belanja",
        prompt: "Tulis artikel tips belanja baju anak online di Shopee dan Tokopedia. Bahas: cek ukuran dengan teliti, baca review foto pembeli, pilih seller rating 4.8+, cek bahan (katun combed, baby terry), musim yang tepat untuk beli, dan cara klaim garansi.",
      },
      {
        title: "10 Tas Ransel Sekolah Anak SD yang Kuat dan Estetik",
        category: "Review Produk",
        prompt: "Tulis artikel review 10 tas ransel sekolah anak SD terbaik. Bahas kapasitas, bahan (waterproof, anti air), tali yang ergonomis, desain, dan harga. Sertakan tips memilih tas yang tidak bikin punggung anak sakit.",
      },
      {
        title: "Mainan Edukatif Anak 3-5 Tahun yang Worth It Beli",
        category: "Review Produk",
        prompt: "Tulis artikel review 10 mainan edukatif untuk anak usia 3-5 tahun. Bahas manfaat perkembangan (motorik, kognitif, kreativitas), bahan aman (non-toxic), dan rekomendasi produk dari marketplace Indonesia dengan harga terjangkau.",
      },
      {
        title: "Cara Dapat Diskon Belanja Produk Anak di Shopee Hingga 70%",
        category: "Tips Hemat",
        prompt: "Tulis artikel tips hemat belanja produk anak di Shopee. Bahas: voucher tersembunyi, flash sale produk anak, cashback, gratis ongkir, combo promo, dan timing belanja yang tepat (back to school, mid-year sale, 11.11).",
      },
      {
        title: "Dress Anak Perempuan untuk Pesta: 10 Pilihan Murah tapi Cantik",
        category: "Review Produk",
        prompt: "Tulis artikel rekomendasi 10 dress anak perempuan untuk pesta/acara formal. Bahas bahan (organza, sateen, tulle), desain, ukuran, harga di bawah Rp100rb, dan tips memilih dress yang nyaman untuk anak bergerak.",
      },
      {
        title: "Sepatu Sekolah Anak: Panduan Memilih yang Tepat per Usia",
        category: "Tips Belanja",
        prompt: "Tulis artikel panduan memilih sepatu sekolah anak. Bahas: ukuran yang tepat (cara ukur kaki anak), bahan (kulit, canvas, mesh), sol anti slip, tips agar awet, dan kapan harus ganti sepatu. Sertakan rekomendasi 5 sepatu terbaik.",
      },
      {
        title: "Mukena Anak Terbaik — Bahan Adem dan Desain Cantik untuk Si Kecil",
        category: "Review Produk",
        prompt: "Tulis artikel review 8 mukena anak terbaik. Bahas bahan (parasut, kaos, baby terry), ukuran per usia, desain yang disukai anak, harga, dan tips merawat mukena anak agar awas.",
      },
      {
        title: "Produk Anak Viral TikTok 2026 yang Beneran Worth It (Bukan Cuma Hype)",
        category: "Review Produk",
        prompt: "Tulis artikel review produk anak yang viral di TikTok 2026. Pilih 10 produk yang beneran bagus, bukan cuma hype. Bahas kenapa viral, apakah worth it, kelebihan dan kekurangan, serta rekomendasi untuk usia berapa.",
      },
      {
        title: "Belanja Perlengkapan Sekolah Anak Hemat — Checklist Lengkap",
        category: "Tips Hemat",
        prompt: "Tulis artikel checklist perlengkapan sekolah anak SD. Bahas: tas, buku tulis, alat tulis, kotak pensil, seragam, sepatu, kaos kaki, tumbler. Sertakan estimasi budget dan tips hemat belanja di marketplace.",
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
      return NextResponse.json(
        { success: false, error: "GROQ_API_KEY belum di-set di Vercel env vars" },
        { status: 500 }
      );
    }

    try {
      // Generate article content via Groq API
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
              content: "Anda adalah jurnalis dan penulis blog Indonesia yang ahli dalam tips belanja online produk anak, review produk, dan gaya hidup keluarga. Tulis dalam bahasa Indonesia yang natural, santai, informatif, dan seperti ditulis manusia sungguhan. Format output sebagai HTML yang siap ditampilkan (h2, p, ul, li, strong). JANGAN pakai markdown (##, **, *). Tulis teks biasa dengan tag HTML. PENTING: Setelah setiap paragraf <p>...</p>, sisipkan <p>&nbsp;</p> untuk memberi jarak kosong antar paragraf (seperti layout berita). Jangan rapat-rapat.",
            },
            {
              role: "user",
              content: `${topic.prompt}\n\nJudul artikel: ${topic.title}\n\nTulis artikel lengkap (minimal 1000 kata) dalam format HTML. Mulai dengan paragraf pembuka yang menarik dan hook yang kuat, lalu isi dengan 4-5 sub-heading (h2) yang detail, sertakan tips praktis dan data konkret, dan tutup dengan kesimpulan yang actionable. Tone: seperti ibu/ayah yang sharing pengalaman belanja produk anak.\n\nFORMAT WAJIB — setiap paragraf dipisah dengan <p>&nbsp;</p>:\n<p>Paragraf pertama...</p>\n<p>&nbsp;</p>\n<p>Paragraf kedua...</p>\n<p>&nbsp;</p>\n<h2>Sub-judul</h2>\n<p>&nbsp;</p>\n<p>Paragraf isi...</p>`,
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
        const errText = await groqResponse.text();
        console.error("[api/blog-generate] Groq error:", groqResponse.status, errText.slice(0, 200));
        throw new Error(`Groq API ${groqResponse.status}`);
      }

      // Generate excerpt via Groq
      const excerptResponse = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: "Buat ringkasan 1 kalimat menarik dalam bahasa Indonesia, max 150 karakter." },
            { role: "user", content: `Buat ringkasan untuk artikel: ${topic.title}` },
          ],
          max_tokens: 200,
          temperature: 0.5,
          reasoning_format: "hidden",
        }),
      });
      if (excerptResponse.ok) {
        const exData = await excerptResponse.json();
        excerpt = exData.choices?.[0]?.message?.content?.slice(0, 200) || topic.title;
      } else {
        excerpt = topic.title;
      }

      metaDescription = excerpt.slice(0, 160);

      // Generate tags via Groq
      const tagsResponse = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: "Berikan 5 tag SEO relevan dalam bahasa Indonesia, dipisah koma. Hanya tag, tidak ada penjelasan." },
            { role: "user", content: `Tag untuk artikel: ${topic.title}` },
          ],
          max_tokens: 100,
          temperature: 0.3,
          reasoning_format: "hidden",
        }),
      });
      if (tagsResponse.ok) {
        const tagData = await tagsResponse.json();
        tags = tagData.choices?.[0]?.message?.content || topic.category;
      } else {
        tags = topic.category;
      }

      // Estimate read time (200 words per minute)
      const wordCount = content.split(/\s+/).length;
      readTime = `${Math.max(3, Math.ceil(wordCount / 200))} menit`;
    } catch (aiErr: any) {
      console.error("[api/blog-generate] AI error:", aiErr);
      return NextResponse.json(
        { success: false, error: "Gagal generate artikel AI: " + (aiErr.message || "unknown") },
        { status: 500 }
      );
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
