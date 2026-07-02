import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading UI — muncul instan saat navigasi antar halaman.
 * Penting buat HP kentang: user langsung lihat sesuatu, bukan layar putih.
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Logo bar skeleton */}
      <div className="sticky top-0 z-50 bg-header-gradient">
        <div className="container mx-auto px-4 max-w-7xl flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Skeleton className="w-7 h-7 rounded-md bg-white/20" />
            <Skeleton className="w-32 h-6 rounded bg-white/20" />
          </div>
          <Skeleton className="w-9 h-9 rounded-full bg-white/20" />
        </div>
      </div>

      {/* Hero skeleton */}
      <div className="bg-header-gradient text-white">
        <div className="container mx-auto px-4 py-4 md:py-6 max-w-7xl">
          <Skeleton className="h-7 w-64 rounded bg-white/20 mb-2" />
          <Skeleton className="h-4 w-96 max-w-full rounded bg-white/15 mb-3" />
          <div className="flex gap-2 mb-4">
            <Skeleton className="h-6 w-24 rounded-full bg-white/15" />
            <Skeleton className="h-6 w-20 rounded-full bg-white/15" />
            <Skeleton className="h-6 w-20 rounded-full bg-white/15" />
          </div>
          <Skeleton className="h-10 w-full rounded-xl bg-white/15" />
        </div>
      </div>

      {/* Main content skeleton */}
      <main className="flex-1 container mx-auto px-4 max-w-7xl py-6">
        {/* Category chips */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full" />
          ))}
        </div>

        {/* Filter tabs */}
        <Skeleton className="h-10 w-full max-w-md rounded-lg mb-6" />

        {/* Products grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden"
            >
              <Skeleton className="w-full aspect-square" />
              <div className="p-3 flex flex-col gap-2">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
