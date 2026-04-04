import { Metadata } from "next";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

function AdminProductsSkeleton() {
  return (
    <div className="p-6 space-y-4" aria-busy="true" aria-label="Loading products...">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="rounded-xl border overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
            <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
            <Skeleton className="h-4 flex-1 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-8 w-20 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export const metadata: Metadata = {
  title: "Products | Kaari Admin Dashboard",
  description: "Manage your handmade crochet products - add, edit, view orders",
  openGraph: {
    type: "website",
    url: "https://kaari.in/admin/products",
    title: "Products | Kaari Admin",
    description: "Manage your handmade crochet products",
  },
};

const AdminProducts = dynamic(
  () => import("@/components/pages/admin/AdminProducts"),
  { loading: () => <AdminProductsSkeleton />, ssr: false }
);

export default function AdminProductsPage() {
  return <AdminProducts />;
}
