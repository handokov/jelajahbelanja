"use client";

import * as React from "react";
import { Lock, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminLoginPage() {
  const [secret, setSecret] = React.useState("");
  const [showSecret, setShowSecret] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!secret.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: secret.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login gagal");
        return;
      }

      // Login berhasil → redirect ke admin dashboard
      window.location.href = "/jb-mgr-admin";
    } catch {
      setError("Gagal terhubung ke server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-fuchsia-600 text-white mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            JB Admin
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Masukkan secret untuk mengakses dashboard
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              type={showSecret ? "text" : "password"}
              placeholder="Admin Secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="pl-10 pr-10 h-12"
              autoFocus
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400 text-center">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full h-12 bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
            disabled={loading || !secret.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Memverifikasi...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Masuk
              </>
            )}
          </Button>
        </form>

        <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center mt-6">
          JelajahBelanja Admin Panel
        </p>
      </div>
    </div>
  );
}
