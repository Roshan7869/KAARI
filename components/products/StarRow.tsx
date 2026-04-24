'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const starSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            starSize,
            i <= Math.round(rating)
              ? 'fill-[#D4AF7F] stroke-[#D4AF7F]'
              : 'fill-stone-200 stroke-stone-200',
          )}
        />
      ))}
    </div>
  );
}
