"use client";

import * as React from "react";
import { Moon, Sun, BookOpen } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * LogoBar — sticky header bar dengan logo, blog link, dan theme toggle.
 */
export function LogoBar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <div className="sticky top-0 z-50 bg-header-gradient">
      <div className="container mx-auto px-4 max-w-7xl flex items-center justify-between h-14">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity" aria-label="Kembali ke beranda">
            <img src="/logo.svg" alt="JB" className="w-7 h-7 pointer-events-none" />
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white">
              JelajahBelanja
            </h1>
          </Link>
          <Badge className="ml-1 bg-white/20 text-white border-white/30 hover:bg-white/20 text-[9px]">
            Beta
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/artikel">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/15 hover:text-white h-9 text-xs gap-1"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Blog</span>
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
