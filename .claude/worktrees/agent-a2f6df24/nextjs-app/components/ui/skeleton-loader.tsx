'use client';

import { cn } from '@/lib/utils';

// ========================================
// Base Skeleton Component with Glassmorphism
// ========================================

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'glass' | 'shimmer';
}

export function Skeleton({ className, variant = 'glass' }: SkeletonProps) {
  if (variant === 'glass') {
    return (
      <div
        className={cn(
          'skeleton-glass relative overflow-hidden',
          className
        )}
      />
    );
  }

  if (variant === 'shimmer') {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-lg bg-muted',
          className
        )}
      >
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>
    );
  }

  return (
    <div className={cn('bg-muted animate-pulse rounded-lg', className)} />
  );
}

// ========================================
// Product Card Skeleton
// ========================================

interface ProductCardSkeletonProps {
  count?: number;
}

export function ProductCardSkeleton({ count = 1 }: ProductCardSkeletonProps) {
  if (count === 1) {
    return (
      <div className="skeleton-product-card">
        <div className="skeleton-product-image" />
        <div className="skeleton-product-content">
          <div className="skeleton-product-title" />
          <div className="skeleton-product-description" />
          <div className="flex items-center justify-between mt-2">
            <div className="skeleton-product-price" />
            <div className="skeleton-glass h-9 w-24 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="skeleton-product-grid">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ========================================
// Product Grid Skeleton
// ========================================

interface ProductGridSkeletonProps {
  columns?: 2 | 3 | 4;
  count?: number;
}

export function ProductGridSkeleton({
  columns = 4,
  count = 8,
}: ProductGridSkeletonProps) {
  const gridCols = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  return (
    <div className={cn('grid grid-cols-1 gap-6', gridCols[columns])}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ========================================
// Cart Item Skeleton
// ========================================

export function CartItemSkeleton() {
  return (
    <div className="skeleton-cart-item">
      <div className="skeleton-cart-image" />
      <div className="skeleton-cart-details">
        <div className="skeleton-cart-title" />
        <div className="skeleton-glass h-4 w-1/2" />
        <div className="flex items-center gap-2 mt-2">
          <div className="skeleton-glass h-8 w-8 rounded" />
          <div className="skeleton-glass h-6 w-12" />
          <div className="skeleton-glass h-8 w-8 rounded" />
        </div>
      </div>
      <div className="skeleton-cart-price" />
    </div>
  );
}

// ========================================
// Cart Skeleton (Multiple Items)
// ========================================

interface CartSkeletonProps {
  itemCount?: number;
}

export function CartSkeleton({ itemCount = 3 }: CartSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: itemCount }).map((_, i) => (
        <CartItemSkeleton key={i} />
      ))}
      <div className="glass-card-cream p-6 mt-6">
        <div className="space-y-3">
          <div className="flex justify-between">
            <div className="skeleton-glass h-5 w-1/4" />
            <div className="skeleton-glass h-5 w-1/6" />
          </div>
          <div className="flex justify-between">
            <div className="skeleton-glass h-5 w-1/4" />
            <div className="skeleton-glass h-5 w-1/6" />
          </div>
          <div className="border-t pt-3 flex justify-between">
            <div className="skeleton-glass h-7 w-1/3" />
            <div className="skeleton-glass h-7 w-1/4" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// Checkout Form Skeleton
// ========================================

export function CheckoutFormSkeleton() {
  return (
    <div className="skeleton-checkout">
      <div className="skeleton-checkout-section">
        <div className="skeleton-checkout-title" />
        <div className="space-y-4">
          <div className="skeleton-checkout-input" />
          <div className="skeleton-checkout-row">
            <div className="skeleton-checkout-input flex-1" />
            <div className="skeleton-checkout-input flex-1" />
          </div>
        </div>
      </div>
      <div className="skeleton-checkout-section">
        <div className="skeleton-checkout-title" />
        <div className="space-y-4">
          <div className="skeleton-checkout-input" />
          <div className="skeleton-checkout-input" />
          <div className="skeleton-checkout-row">
            <div className="skeleton-checkout-input flex-1" />
            <div className="skeleton-checkout-input flex-1" />
            <div className="skeleton-checkout-input w-24" />
          </div>
        </div>
      </div>
      <div className="skeleton-checkout-section">
        <div className="skeleton-checkout-title" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton-glass w-5 h-5 rounded-full" />
              <div className="skeleton-glass h-5 flex-1" />
              <div className="skeleton-glass h-5 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ========================================
// Order Summary Skeleton
// ========================================

export function OrderSummarySkeleton() {
  return (
    <div className="glass-card-cream p-6 space-y-4">
      <div className="skeleton-glass h-6 w-1/2" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton-glass w-16 h-16 rounded" />
            <div className="flex-1 space-y-2">
              <div className="skeleton-glass h-4 w-2/3" />
              <div className="skeleton-glass h-3 w-1/3" />
            </div>
            <div className="skeleton-glass h-5 w-16" />
          </div>
        ))}
      </div>
      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between">
          <div className="skeleton-glass h-4 w-1/4" />
          <div className="skeleton-glass h-4 w-1/6" />
        </div>
        <div className="flex justify-between">
          <div className="skeleton-glass h-4 w-1/4" />
          <div className="skeleton-glass h-4 w-1/6" />
        </div>
        <div className="flex justify-between font-semibold">
          <div className="skeleton-glass h-6 w-1/3" />
          <div className="skeleton-glass h-6 w-1/4" />
        </div>
      </div>
    </div>
  );
}

// ========================================
// Admin Dashboard Skeleton
// ========================================

export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card-cream p-6">
            <div className="skeleton-glass h-4 w-1/2 mb-2" />
            <div className="skeleton-glass h-8 w-1/3" />
          </div>
        ))}
      </div>
      <div className="glass-card-cream p-6">
        <div className="skeleton-glass h-6 w-1/4 mb-4" />
        <div className="skeleton-glass h-64 w-full" />
      </div>
      <div className="glass-card-cream p-6">
        <div className="skeleton-glass h-6 w-1/4 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="skeleton-glass h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton-glass h-4 w-1/3" />
                <div className="skeleton-glass h-3 w-1/4" />
              </div>
              <div className="skeleton-glass h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ========================================
// Hero Section Skeleton
// ========================================

export function HeroSkeleton() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="skeleton-glass absolute inset-0" />
      <div className="container relative z-10 mx-auto px-4 py-20">
        <div className="max-w-2xl space-y-6">
          <div className="skeleton-glass h-16 w-3/4" />
          <div className="skeleton-glass h-8 w-1/2" />
          <div className="skeleton-glass h-6 w-2/3" />
          <div className="flex gap-4">
            <div className="skeleton-glass h-12 w-32" />
            <div className="skeleton-glass h-12 w-40" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// Page Loader Component
// ========================================

export function PageLoader() {
  return (
    <div className="page-loader">
      <div className="page-loader-spinner" />
    </div>
  );
}

// ========================================
// Full Page Loading State
// ========================================

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-warm">
      <div className="page-loader-spinner" />
      <p className="mt-4 text-muted-foreground animate-pulse">{message}</p>
    </div>
  );
}

// ========================================
// Content Shimmer Effect (for dynamic content)
// ========================================

export function ContentShimmer({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
    </div>
  );
}

// Add shimmer keyframe to globals.css or use inline style
const shimmerStyle = `
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;

// Inject style if needed
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = shimmerStyle;
  document.head.appendChild(styleSheet);
}