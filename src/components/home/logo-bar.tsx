"use client";

import * as React from "react";
import { Moon, Sun, BookOpen } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchAutocomplete } from "@/components/search-autocomplete";

interface LogoBarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
}

/**
 * LogoBar — sticky header bar dengan logo, search, blog link, dan theme toggle.
 */
export function LogoBar({ search = "", onSearchChange }: LogoBarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <div className="sticky top-0 z-50 bg-header-gradient">
      <div className="container mx-auto px-4 max-w-7xl flex items-center gap-2 md:gap-3 h-14">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-1.5 md:gap-2 cursor-pointer pointer-events-auto relative z-10 hover:opacity-90 transition flex-shrink-0"
          aria-label="Kembali ke beranda JelajahBelanja"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            if (window.location.search) {
              window.location.href = "/";
            }
          }}
        >
          <img src="/logo.svg" alt="JelajahBelanja logo" className="w-7 h-7 pointer-events-none select-none flex-shrink-0" />
          <h1 className="text-lg md:text-2xl font-extrabold tracking-tight text-white hidden sm:block">
            JelajahBelanja
          </h1>
        </Link>
        <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/20 text-[9px] pointer-events-none flex-shrink-0 hidden sm:inline-flex">
          Beta
        </Badge>

        {/* Search bar — always visible */}
        {onSearchChange && (
          <div className="flex-1 max-w-md mx-1">
            <SearchAutocomplete
              value={search}
              onChange={onSearchChange}
              onSearch={onSearchChange}
              placeholder="Cari produk viral..."
              variant="dark"
            />
          </div>
        )}

        {/* Right: Blog + Theme */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Link href="/artikel" className="hidden md:block">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/15 hover:text-white h-9 text-xs gap-1"
            >
              <BookOpen className="w-4 h-4" />
              <span>Blog</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-white hover:bg-white/15 hover:text-white h-9 w-9"
            aria-label="Ganti tema"
          >
            {mounted && theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
