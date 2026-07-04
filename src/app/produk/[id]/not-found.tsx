"use client";

export default function ProductNotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="rounded-full bg-gray-100 p-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-800">
        Produk Tidak Ditemukan
      </h2>
      <p className="text-gray-500 max-w-md">
        Produk yang Anda cari tidak tersedia atau sudah dihapus.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => { window.location.reload(); }}
          className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
        >
          Muat Ulang
        </button>
        <button
          onClick={() => { window.location.href = "/"; }}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Kembali ke Beranda
        </button>
      </div>
    </div>
  );
}
