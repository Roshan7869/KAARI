'use client';

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BarChart3, Package, ShoppingCart, Users } from "lucide-react";

export default function AdminDashboardPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/");
    }
  }, [user, isAdmin, loading, router]);

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!user || !isAdmin) {
    return <div className="p-8 text-center text-red-600">Access Denied</div>;
  }

  const stats = [
    { label: "Total Revenue", value: "₹45,231", icon: BarChart3 },
    { label: "Products", value: "24", icon: Package },
    { label: "Orders", value: "156", icon: ShoppingCart },
    { label: "Customers", value: "89", icon: Users },
  ];

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl text-kaari-dark">Dashboard</h1>
      
      <div className="grid md:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-lg border border-kaari-dark/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-kaari-dark/60 mb-1">{stat.label}</p>
                <p className="font-display text-2xl text-kaari-dark">{stat.value}</p>
              </div>
              <stat.icon className="w-8 h-8 text-kaari-dark/30" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
