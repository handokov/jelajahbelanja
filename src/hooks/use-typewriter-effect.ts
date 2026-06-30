"use client";

import * as React from "react";

/**
 * Hook: typewriter effect — animasi teks muncul karakter per karakter.
 *
 * Sebelumnya: logika identik duplikat di product-detail-dialog.tsx & ProductDetailClient.tsx.
 * Sekarang: satu hook, konsisten di semua komponen.
 *
 * @param text   Teks penuh yang ingin ditampilkan perlahan
 * @param speed  Interval antar karakter dalam ms (default 20)
 * @param step   Jumlah karakter per tick (default 2)
 * @returns { displayedText, isDone }
 */
export function useTypewriterEffect(
  text: string,
  speed: number = 20,
  step: number = 2,
): { displayedText: string; isDone: boolean } {
  const [displayedText, setDisplayedText] = React.useState("");
  const [isDone, setIsDone] = React.useState(false);

  React.useEffect(() => {
    if (!text) {
      setDisplayedText("");
      setIsDone(false);
      return;
    }

    let i = 0;
    setDisplayedText("");
    setIsDone(false);

    const interval = setInterval(() => {
      i += step;
      if (i >= text.length) {
        setDisplayedText(text);
        setIsDone(true);
        clearInterval(interval);
      } else {
        setDisplayedText(text.slice(0, i));
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, step]);

  return { displayedText, isDone };
}
