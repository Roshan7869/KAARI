'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, MessageSquare, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ReviewCard, Review } from './ReviewCard';
import { Reveal } from '@/components/Reveal';
import { cn } from '@/lib/utils';

export type ReviewSortOption =
  | 'newest'
  | 'highest'
  | 'lowest'
  | 'helpful';

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ReviewListProps {
  productId: string;
  reviews: Review[];
  pagination?: PaginationInfo;
  currentUserId?: string | null;
  sortBy?: ReviewSortOption;
  onSortChange?: (sort: ReviewSortOption) => void;
  onPageChange?: (page: number) => void;
  onHelpful?: (reviewId: string) => void;
  onEdit?: (review: Review) => void;
  onDelete?: (reviewId: string) => void;
  isLoading?: boolean;
  error?: string | null;
  totalPages?: number;
  currentPage?: number;
  className?: string;
}

export function ReviewList({
  productId: _productId,
  reviews,
  pagination,
  currentUserId,
  sortBy = 'newest',
  onSortChange,
  onPageChange,
  onHelpful,
  onEdit,
  onDelete,
  isLoading,
  error,
  totalPages: propTotalPages,
  currentPage: propCurrentPage,
  className,
}: ReviewListProps) {
  const [localSortBy, setLocalSortBy] = useState<ReviewSortOption>(sortBy);

  const handleSortChange = (value: ReviewSortOption) => {
    setLocalSortBy(value);
    onSortChange?.(value);
  };

  const sortOptions: { value: ReviewSortOption; label: string }[] = [
    { value: 'newest', label: 'Newest First' },
    { value: 'highest', label: 'Highest Rated' },
    { value: 'lowest', label: 'Lowest Rated' },
    { value: 'helpful', label: 'Most Helpful' },
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="h-8 w-32 bg-muted rounded animate-pulse" />
          <div className="h-10 w-[180px] bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-5 bg-muted rounded-lg animate-pulse h-32" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-12 px-4 text-center',
          className
        )}
      >
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-destructive" />
        </div>
        <h3 className="font-display text-lg text-foreground mb-2">
          Failed to Load Reviews
        </h3>
        <p className="font-body text-sm text-muted-foreground max-w-sm">
          {error}
        </p>
      </div>
    );
  }

  // Empty state
  if (reviews.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-12 px-4 text-center',
          className
        )}
      >
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-display text-lg text-foreground mb-2">
          No Reviews Yet
        </h3>
        <p className="font-body text-sm text-muted-foreground max-w-sm">
          Be the first to share your thoughts about this product. Your review
          helps others make informed decisions.
        </p>
      </div>
    );
  }

  const currentPage = propCurrentPage ?? pagination?.page ?? 1;
  const totalPages = propTotalPages ?? pagination?.totalPages ?? 1;
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with sort */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
          <span className="font-body text-sm text-muted-foreground">
            Sort by:
          </span>
        </div>

        <Select
          value={localSortBy}
          onValueChange={(value) =>
            handleSortChange(value as ReviewSortOption)
          }
        >
          <SelectTrigger className="w-[180px] font-body text-sm">
            <SelectValue placeholder="Sort reviews" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="font-body text-sm"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Review count */}
      <p className="font-body text-sm text-muted-foreground">
        Showing {reviews.length} of {pagination?.total ?? reviews.length} reviews
      </p>

      {/* Reviews grid */}
      <div className="grid grid-cols-1 gap-4">
        {reviews.map((review) => (
          <Reveal key={review.id} className="review-item">
            <ReviewCard
              review={review}
              currentUserId={currentUserId}
              onHelpful={onHelpful}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </Reveal>
        ))}
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-6 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={!hasPrevPage}
            className="gap-1 font-body"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <span className="font-body text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={!hasNextPage}
            className="gap-1 font-body"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export type { Review };
