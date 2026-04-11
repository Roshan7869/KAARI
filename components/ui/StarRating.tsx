'use client';

import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  count: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
}

export function StarRating({ rating, count, size = 'sm', showCount = true }: StarRatingProps) {
  // Don't show rating if there are no reviews
  if (count === 0) return null;

  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  const sizeClasses = {
    sm: { star: 12, spacing: 'gap-0.5' },
    md: { star: 16, spacing: 'gap-1' },
    lg: { star: 20, spacing: 'gap-1' }
  };

  const { star: starSize, spacing } = sizeClasses[size];

  return (
    <div className="flex items-center">
      <div className={`flex ${spacing}`}>
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            size={starSize}
            className="fill-yellow-400 text-yellow-400"
            aria-hidden="true"
          />
        ))}
        {hasHalf && (
          <div className="relative" style={{ width: starSize, height: starSize }}>
            <Star
              size={starSize}
              className="absolute text-gray-300"
              aria-hidden="true"
            />
            <div
              className="absolute overflow-hidden"
              style={{ width: `${(rating % 1) * 100}%` }}
            >
              <Star
                size={starSize}
                className="fill-yellow-400 text-yellow-400"
                aria-hidden="true"
              />
            </div>
          </div>
        )}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star
            key={`empty-${i}`}
            size={starSize}
            className="text-gray-300"
            aria-hidden="true"
          />
        ))}
      </div>
      {showCount && (
        <span className={`ml-1 text-gray-600 ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'}`}>
          ({count})
        </span>
      )}
    </div>
  );
}