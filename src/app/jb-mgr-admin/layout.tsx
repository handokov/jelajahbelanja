<<<<<<< HEAD
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

=======
export const dynamic = "force-dynamic";
>>>>>>> 708b746e9744a8c43d24b54b1818a255a7a7fd9e
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
