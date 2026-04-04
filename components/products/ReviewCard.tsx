'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Star, ThumbsUp, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sanitizeUrl } from '@/lib/sanitization';

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  rating: number;
  title: string;
  content: string;
  createdAt: string;
  helpfulCount: number;
  isVerifiedPurchase: boolean;
}

interface ReviewCardProps {
  review: Review;
  currentUserId?: string | null;
  onHelpful?: (reviewId: string) => void;
  onEdit?: (review: Review) => void;
  onDelete?: (reviewId: string) => void;
  className?: string;
}

export function ReviewCard({
  review,
  currentUserId,
  onHelpful,
  onEdit,
  onDelete,
  className,
}: ReviewCardProps) {
  const [hasMarkedHelpful, setHasMarkedHelpful] = useState(false);
  const [localHelpfulCount, setLocalHelpfulCount] = useState(review.helpfulCount);
  const isOwnReview = currentUserId === review.userId;

  const handleHelpful = () => {
    if (hasMarkedHelpful || isOwnReview) return;
    setHasMarkedHelpful(true);
    setLocalHelpfulCount((prev) => prev + 1);
    onHelpful?.(review.id);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div
      className={cn(
        'p-5 fabric-card rounded-lg border border-border/50 bg-card',
        className
      )}
    >
      {/* Header: User info and rating */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {sanitizeUrl(review.userAvatar || '') ? (
              <Image
                src={sanitizeUrl(review.userAvatar || '')}
                alt={review.userName}
                className="w-full h-full object-cover rounded-full"
                width={40}
                height={40}
              />
            ) : (
              <span className="font-body text-sm font-medium text-primary">
                {review.userName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* User info */}
          <div>
            <p className="font-body text-sm font-medium text-foreground">
              {review.userName}
            </p>
            <div className="flex items-center gap-2">
              <span className="font-body text-xs text-muted-foreground">
                {formatDate(review.createdAt)}
              </span>
              {review.isVerifiedPurchase && (
                <span className="flex items-center gap-0.5 text-xs text-green-600">
                  <CheckCircle2 className="w-3 h-3" />
                  <span className="font-body">Verified</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Rating stars */}
        <div
          className="flex items-center gap-0.5"
          role="img"
          aria-label={`${review.rating} out of 5 stars`}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                'w-4 h-4',
                i < review.rating
                  ? 'fill-accent text-accent'
                  : 'text-muted'
              )}
            />
          ))}
        </div>
      </div>

      {/* Review content */}
      <div className="space-y-2 mb-4">
        {review.title && (
          <h4 className="font-body font-medium text-foreground text-sm">
            {review.title}
          </h4>
        )}
        <p className="font-body text-sm text-muted-foreground leading-relaxed">
          {review.content}
        </p>
      </div>

      {/* Footer: Helpful count and actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-4">
          {/* Helpful button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleHelpful}
            disabled={hasMarkedHelpful || isOwnReview}
            className={cn(
              'h-8 px-2 text-xs font-body gap-1.5',
              hasMarkedHelpful && 'text-primary'
            )}
          >
            <ThumbsUp
              className={cn(
                'w-3.5 h-3.5',
                hasMarkedHelpful && 'fill-current'
              )}
            />
            Helpful ({localHelpfulCount})
          </Button>
        </div>

        {/* Edit/Delete for own review */}
        {isOwnReview && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit?.(review)}
              className="h-8 w-8 p-0"
              aria-label="Edit review"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete?.(review.id)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              aria-label="Delete review"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
