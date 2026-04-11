'use client';

import { Star, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RatingDistribution {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

interface ReviewSummaryProps {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: RatingDistribution;
  onWriteReview?: () => void;
  canWriteReview?: boolean;
  className?: string;
}

export function ReviewSummary({
  averageRating,
  totalReviews,
  ratingDistribution,
  onWriteReview,
  canWriteReview = true,
  className,
}: ReviewSummaryProps) {
  // Calculate percentages
  const total = totalReviews || 1; // Prevent division by zero
  const percentages = {
    5: Math.round((ratingDistribution[5] / total) * 100),
    4: Math.round((ratingDistribution[4] / total) * 100),
    3: Math.round((ratingDistribution[3] / total) * 100),
    2: Math.round((ratingDistribution[2] / total) * 100),
    1: Math.round((ratingDistribution[1] / total) * 100),
  };

  const ratingCounts = [
    { stars: 5, count: ratingDistribution[5], percentage: percentages[5] },
    { stars: 4, count: ratingDistribution[4], percentage: percentages[4] },
    { stars: 3, count: ratingDistribution[3], percentage: percentages[3] },
    { stars: 2, count: ratingDistribution[2], percentage: percentages[2] },
    { stars: 1, count: ratingDistribution[1], percentage: percentages[1] },
  ];

  // Format average rating to 1 decimal place
  const formattedAverage = averageRating.toFixed(1);

  return (
    <div
      className={cn(
        'p-6 fabric-card rounded-xl border border-border/50 bg-card',
        className
      )}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Average rating */}
        <div className="flex flex-col items-center justify-center text-center md:border-r md:border-border/50 md:pr-8">
          <div className="space-y-2">
            <span className="font-display text-5xl font-bold text-foreground">
              {formattedAverage}
            </span>
            <div
              className="flex items-center justify-center gap-0.5"
              role="img"
              aria-label={`${formattedAverage} out of 5 stars`}
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'w-5 h-5',
                    i < Math.round(averageRating)
                      ? 'fill-accent text-accent'
                      : 'text-muted'
                  )}
                />
              ))}
            </div>
            <p className="font-body text-sm text-muted-foreground">
              Based on {totalReviews.toLocaleString('en-IN')}{' '}
              {totalReviews === 1 ? 'review' : 'reviews'}
            </p>
          </div>

          {/* Write review button */}
          {canWriteReview && (
            <Button
              onClick={onWriteReview}
              className="mt-6 gap-2 font-body w-full md:w-auto"
              variant={totalReviews === 0 ? 'default' : 'outline'}
            >
              <PenLine className="w-4 h-4" />
              Write a Review
            </Button>
          )}
        </div>

        {/* Right: Rating distribution bars */}
        <div className="space-y-2 md:pl-8">
          {ratingCounts.map((item) => (
            <div key={item.stars} className="flex items-center gap-3">
              {/* Star label */}
              <div className="flex items-center gap-1 w-12 flex-shrink-0">
                <span className="font-body text-sm font-medium">{item.stars}</span>
                <Star className="w-3.5 h-3.5 fill-accent text-accent" />
              </div>

              {/* Progress bar */}
              <div className="flex-1 min-w-0">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${item.percentage}%` }}
                    aria-valuenow={item.percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    role="progressbar"
                  />
                </div>
              </div>

              {/* Count */}
              <span className="font-body text-xs text-muted-foreground w-10 text-right flex-shrink-0">
                {item.count.toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export type { RatingDistribution };
