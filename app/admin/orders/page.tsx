import { Metadata } from "next";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_URL } from "@/lib/metadata";

function AdminOrdersSkeleton() {
  return (
    <div className="p-6 space-y-4" aria-busy="true" aria-label="Loading orders...">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="rounded-xl border overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 flex-1 rounded" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-8 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export const metadata: Metadata = {
  title: "Orders | Kaari Admin Dashboard",
  description: "Manage customer orders and track fulfillment status",
  openGraph: {
    type: "website",
    url: `${APP_URL}/admin/orders`,
    title: "Orders | Kaari Admin",
    description: "Manage customer orders and track fulfillment",
  },
};

const AdminOrders = dynamic(
  () => import("@/components/pages/admin/AdminOrders"),
  { loading: () => <AdminOrdersSkeleton /> }
);

export default function AdminOrdersPage() {
  return <AdminOrders />;
}
