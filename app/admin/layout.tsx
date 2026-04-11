"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Image as ImageIcon,
  Star,
  Tv2,
  Tag,
  Boxes,
  FileUp,
  ScrollText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AdminDashboardSkeleton } from "@/components/ui/skeleton-loader";
import type { ReactNode } from "react";

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/admin", icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: "Billboard", path: "/admin/billboard", icon: <Tv2 className="w-5 h-5" /> },
  { label: "Products", path: "/admin/products", icon: <Package className="w-5 h-5" /> },
  { label: "Media Library", path: "/admin/media", icon: <ImageIcon className="w-5 h-5" /> },
  { label: "Orders", path: "/admin/orders", icon: <ShoppingCart className="w-5 h-5" /> },
  { label: "Customers", path: "/admin/customers", icon: <Users className="w-5 h-5" /> },
  { label: "Reviews", path: "/admin/reviews", icon: <Star className="w-5 h-5" /> },
  { label: "Coupons", path: "/admin/coupons", icon: <Tag className="w-5 h-5" /> },
  { label: "Inventory", path: "/admin/inventory", icon: <Boxes className="w-5 h-5" /> },
  { label: "Import", path: "/admin/products/import", icon: <FileUp className="w-5 h-5" /> },
  { label: "Audit Log", path: "/admin/audit", icon: <ScrollText className="w-5 h-5" /> },
  { label: "Settings", path: "/admin/settings", icon: <Settings className="w-5 h-5" /> },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, signOut, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!isAdmin) {
      router.push("/");
    }
  }, [user, authLoading, isAdmin, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  // Show skeleton while Clerk is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <AdminDashboardSkeleton />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        id="admin-sidebar"
        className={cn(
          "fixed lg:sticky top-0 left-0 h-screen bg-card border-r border-border z-50 flex flex-col",
          sidebarOpen ? "w-64" : "w-0 lg:w-20"
        )}
        initial={false}
        animate={{ width: sidebarOpen ? 256 : 80 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        aria-label="Admin navigation sidebar"
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="font-display text-xl text-foreground">
              {sidebarOpen ? "कारी Admin" : "क"}
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:flex hidden"
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={sidebarOpen}
            aria-controls="admin-sidebar"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto" aria-label="Admin menu">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-sm transition-colors",
                pathname === item.path || pathname.startsWith(item.path + "/")
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              aria-label={item.label}
              aria-current={pathname === item.path ? "page" : undefined}
            >
              {item.icon}
              {sidebarOpen && <span className="font-body text-sm">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={handleSignOut}
            aria-label="Sign out and logout"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="font-body text-sm">Sign Out</span>}
          </Button>
        </div>
      </motion.aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-30 flex items-center justify-between px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={sidebarOpen}
          aria-controls="admin-sidebar"
        >
          <Menu className="w-6 h-6" />
        </Button>
        <span className="font-display text-xl">कारी Admin</span>
        <div className="w-10" />
      </div>

      {/* Main content */}
      <main className="flex-1 min-h-screen lg:pt-0 pt-16">
        {children}
      </main>
    </div>
  );
}
