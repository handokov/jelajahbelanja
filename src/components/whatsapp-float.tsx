"use client";

import { MessageCircle } from "lucide-react";

const WA_NUMBER = "6289622565076";
const WA_TEXT = "Halo JelajahBelanja! Saya ingin bertanya...";

export function WhatsAppFloat() {
  return (
    <a
      href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_TEXT)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat via WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
    >
      {/* Label — muncul di hover (desktop) */}
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium group-hover:max-w-[140px] group-hover:pl-3 group-hover:pr-1 transition-all duration-300">
        Chat Kami
      </span>

      {/* Icon bulat */}
      <span className="flex items-center justify-center w-14 h-14 shrink-0">
        <svg viewBox="0 0 32 32" className="w-7 h-7 fill-current">
          <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16c0 3.5 1.132 6.742 3.054 9.378L1.054 31.29l6.118-1.962A15.914 15.914 0 0 0 16.004 32C24.826 32 32 24.826 32 16S24.826 0 16.004 0zm9.314 22.61c-.39 1.1-1.932 2.014-3.17 2.282-.846.18-1.95.324-5.67-1.218-4.762-1.972-7.826-6.812-8.064-7.128-.23-.316-1.928-2.568-1.928-4.896s1.22-3.476 1.652-3.95c.432-.474.944-.592 1.258-.592.314 0 .63.002.906.016.29.016.682-.112 1.066.814.39.942 1.326 3.242 1.442 3.476.118.236.196.512.04.828-.158.316-.236.512-.472.79-.236.276-.498.618-.71.828-.236.236-.482.49-.206.962.276.472 1.226 2.024 2.632 3.278 1.81 1.612 3.338 2.112 3.81 2.348.472.236.748.196 1.024-.118.276-.316 1.18-1.378 1.496-1.854.316-.474.63-.392 1.064-.236.432.158 2.75 1.296 3.222 1.532.472.236.788.354.906.55.118.196.118 1.136-.272 2.236z" />
        </svg>
      </span>
    </a>
  );
}
