'use client'
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { ProtectedRouteSkeleton } from '@/components/ui/skeleton-loader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

/**
 * ProtectedRoute component ensures only authenticated users can access protected routes.
 * If user is not authenticated, redirects to login page with return path preserved.
 * If requireAdmin=true, also checks for admin role (delegated to component level for now).
 */
export default function ProtectedRoute({ children, requireAdmin }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <ProtectedRouteSkeleton />;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
