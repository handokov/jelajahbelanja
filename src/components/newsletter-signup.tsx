"use client";

import * as React from "react";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * NewsletterSignup — email capture form untuk footer.
 *
 * Fitur:
 * - Email validation (basic regex)
 * - Loading state saat submit
 * - Success state (checkmark) setelah submit
 * - Persist ke localStorage (sementara, sampai ada email service integration)
 *
 * Integrasi email service (Mailchimp, ConvertKit, dll) bisa ditambah nanti
 * dengan fetch ke API route yang handle subscribe.
 */
export function NewsletterSignup({ className }: { className?: string }) {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = React.useState("");

  const validateEmail = (e: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim()) {
      setStatus("error");
      setErrorMessage("Email wajib diisi");
      return;
    }

    if (!validateEmail(email)) {
      setStatus("error");
      setErrorMessage("Format email tidak valid");
      return;
    }

    setStatus("loading");

    try {
      // Simulasi subscribe (replace dengan API call kalau sudah ada email service)
      // Contoh: await fetch("/api/newsletter", { method: "POST", body: JSON.stringify({ email }) })
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Persist ke localStorage untuk sekarang
      try {
        const existing = JSON.parse(localStorage.getItem("jb-newsletter") || "[]");
        if (!existing.includes(email)) {
          existing.push(email);
          localStorage.setItem("jb-newsletter", JSON.stringify(existing));
        }
      } catch {
        // ignore
      }

      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
      setErrorMessage("Gagal subscribe. Coba lagi.");
    }
  };

  if (status === "success") {
    return (
      <div className={cn("rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center", className)}>
        <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
          Berhasil subscribe!
        </p>
        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
          Anda akan dapat update produk viral terbaru via email.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="text-[10px] text-emerald-600 hover:underline mt-2"
        >
          Subscribe email lain
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1.5 mb-1">
        <Mail className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-xs font-semibold text-white">
          Dapatkan Update Produk Viral
        </span>
      </div>
      <p className="text-[10px] text-white/70 mb-2">
        Subscribe untuk dapat info produk viral + diskon terbaru langsung ke email Anda.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          type="email"
          placeholder="email@anda.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          disabled={status === "loading"}
          className="flex-1 h-9 text-xs bg-white/10 border-white/20 text-white placeholder-white/50"
          aria-label="Email untuk newsletter"
        />
        <Button
          type="submit"
          size="sm"
          disabled={status === "loading"}
          className="h-9 text-xs bg-violet-600 hover:bg-violet-700 text-white"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Subscribe...
            </>
          ) : (
            "Subscribe"
          )}
        </Button>
      </div>
      {status === "error" && (
        <p className="text-[10px] text-red-400">{errorMessage}</p>
      )}
      <p className="text-[9px] text-white/50">
        Gratis. No spam. Unsubscribe kapan saja.
      </p>
    </form>
  );
}
