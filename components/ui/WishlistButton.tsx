'use client';

import { Heart } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

interface WishlistButtonProps {
  productId: string;
  initialWishlisted?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function WishlistButton({
  productId,
  initialWishlisted = false,
  className = '',
  size = 'md',
}: WishlistButtonProps) {
  const [isWishlisted, setIsWishlisted] = useState(initialWishlisted);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user, isLoaded } = useAuth();

  // Only show button when auth is loaded
  if (!isLoaded) {
    return (
      <button
        className={`p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-sm ${className}`}
        disabled
        aria-label="Loading"
      >
        <Heart
          size={size === 'sm' ? 16 : size === 'md' ? 20 : 24}
          className="text-gray-300"
        />
      </button>
    );
  }

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;

    // Check if user is logged in
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });

      const data = await res.json();

      if (!res.ok) {
        logger.error('Wishlist toggle failed:', data.error);
        throw new Error(data.error || 'Failed to toggle wishlist');
      }

      if (data.action === 'added') {
        setIsWishlisted(true);
        logger.info('Product added to wishlist', { productId });
      } else if (data.action === 'removed') {
        setIsWishlisted(false);
        logger.info('Product removed from wishlist', { productId });
      }
    } catch (error) {
      logger.error('Failed to toggle wishlist', { error: (error as Error).message, productId });
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: { button: 'p-1.5', icon: 16 },
    md: { button: 'p-2', icon: 20 },
    lg: { button: 'p-2.5', icon: 24 }
  };

  const { button: buttonPadding, icon: iconSize } = sizeClasses[size];

  return (
    <button
      onClick={toggleWishlist}
      disabled={isLoading}
      className={`
        ${buttonPadding} rounded-full
        bg-white/90 backdrop-blur-sm
        shadow-sm hover:shadow-md
        transition-all duration-200
        hover:scale-110
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Heart
        size={iconSize}
        className={`
          transition-all duration-200
          ${isWishlisted
            ? 'fill-red-500 text-red-500'
            : 'text-gray-600 hover:text-red-500'
          }
          ${isLoading ? 'animate-pulse' : ''}
        `}
      />
    </button>
  );
}