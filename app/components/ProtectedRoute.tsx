"use client";

import { useAuth } from "@/contexts/AuthContext";
import { redirect } from "next/navigation";
import { useEffect } from "react";
import { ProtectedRouteSkeleton } from "@/components/ui/skeleton-loader";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      redirect("/login");
    }
  }, [user, loading]);

  if (loading) {
    return <ProtectedRouteSkeleton />;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
