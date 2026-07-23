// Test extractProductStats patterns (v3.3.0)
// Simplified version for testing: takes a string instead of a DOM element.
// Mirrors the rating/review/sold logic of the real extractProductStats() in popup.js.

function extractProductStats(text) {
  const out = { rating: null, reviewCount: null, soldCount: null };
  if (!text) return out;
  text = String(text).trim();

  // -- Rating + Review count (combined "4.9 (1.234 rating)" pattern) --
  const ratingReviewMatch = text.match(
    /(\d+[.,]\d+)\s*\(\s*(\d[\d.,]*)\s*(rb|ribu)?\s*(?:rating|review|evaluasi|ulasan)\s*\)/i
  );
  if (ratingReviewMatch) {
    out.rating = parseFloat(ratingReviewMatch[1].replace(',', '.'));
    let rn = parseFloat(ratingReviewMatch[2].replace(/\./g, '').replace(',', '.'));
    if (ratingReviewMatch[3]) rn *= 1000;
    out.reviewCount = Math.round(rn);
  }

  // -- Rating text fallback patterns --
  if (out.rating === null) {
    const fallbackPats = [
      /(\d+[.,]\d+)\s*(?:\/\s*5|dari\s*5|bintang|⭐|🌟)/i,
      /(?:rating|rate)\s*[:\-]?\s*(\d+[.,]\d+)/i,
      // v3.3.0: standalone rating "4.8" — 1-digit.1-digit, not surrounded by digits
      /(?<!\d)(\d\.\d)(?!\d)/,
    ];
    for (const p of fallbackPats) {
      const m = text.match(p);
      if (m) { out.rating = parseFloat(m[1].replace(',', '.')); break; }
    }
  }

  // -- Review count (standalone) --
  if (out.reviewCount === null) {
    const rm = text.match(/\(\s*(\d[\d.,]*)\s*(rb|ribu)?\s*(?:rating|review|evaluasi|ulasan)\s*\)/i);
    if (rm) {
      let rn = parseFloat(rm[1].replace(/\./g, '').replace(',', '.'));
      if (rm[2]) rn *= 1000;
      out.reviewCount = Math.round(rn);
    }
  }

  // -- Sold count -- disambiguates dot: decimal (RB/ribu) vs thousands sep --
  const soldPats = [
    /(\d+(?:[.,]\d+)?)\s*(rb|ribu)\s*terjual/i,
    /terjual\s*(\d+(?:[.,]\d+)?)\s*\+?\s*(rb|ribu)?/i,
    /([\d.,]+)\s*\+?\s*terjual/i,
  ];
  for (const pat of soldPats) {
    const m = text.match(pat);
    if (m) {
      const hasMultiplier = !!(m[2] && /rb|ribu/i.test(m[2]));
      let numStr = m[1];
      numStr = hasMultiplier
        ? numStr.replace(',', '.')
        : numStr.replace(/\./g, '').replace(',', '.');
      let n = parseFloat(numStr);
      if (hasMultiplier) n *= 1000;
      if (!isNaN(n)) { out.soldCount = Math.round(n); break; }
    }
  }

  return out;
}

// ─── Test cases ─────────────────────────────────────────────────────────────
const tests = [
  // Core task cases (6)
  { input: "4.9 (1.234 rating) 1.2RB terjual",
    expect: { rating: 4.9, reviewCount: 1234, soldCount: 1200 } },
  { input: "Terjual 100+ · 4.8",
    expect: { rating: 4.8, soldCount: 100 } },
  { input: "4.7 bintang · 10RB terjual",
    expect: { rating: 4.7, soldCount: 10000 } },
  { input: "1,5RB terjual",
    expect: { soldCount: 1500 } },
  { input: "10.5RB terjual",
    expect: { soldCount: 10500 } },
  { input: "1.234 terjual",
    expect: { soldCount: 1234 } },

  // Additional edge cases (6 more for 12/12)
  { input: "5.0 (5RB rating) 2.5RB terjual",
    expect: { rating: 5.0, reviewCount: 5000, soldCount: 2500 } },
  { input: "Terjual 1.500 · 4.8 bintang",
    expect: { rating: 4.8, soldCount: 1500 } },
  { input: "4.9 dari 5 · 100RB terjual",
    expect: { rating: 4.9, soldCount: 100000 } },
  { input: "rating: 4.6 · (892 ulasan)",
    expect: { rating: 4.6, reviewCount: 892 } },
  { input: "Terjual 50+",
    expect: { soldCount: 50 } },
  { input: "0RB terjual",
    expect: { soldCount: 0 } },
];

let pass = 0;
let fail = 0;
for (const t of tests) {
  const r = extractProductStats(t.input);
  // Only check keys present in t.expect
  const ok = Object.entries(t.expect).every(([k, v]) => r[k] === v);
  if (ok) {
    pass++;
    console.log(`  PASS  ${JSON.stringify(t.input)}`);
    console.log(`        -> ${JSON.stringify(r)}`);
  } else {
    fail++;
    console.log(`  FAIL  ${JSON.stringify(t.input)}`);
    console.log(`        got    : ${JSON.stringify(r)}`);
    console.log(`        expect : ${JSON.stringify(t.expect)}`);
  }
}
console.log('');
console.log(`Result: ${pass}/${tests.length} pass (${fail} fail)`);
process.exit(fail > 0 ? 1 : 0);
