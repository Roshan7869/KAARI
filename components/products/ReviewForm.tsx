'use client';

import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface ReviewFormData {
  rating: number;
  content: string;
}

interface ReviewFormProps {
  productId: string;
  orderId?: string;
  initialData?: Partial<ReviewFormData>;
  onSubmit: (data: ReviewFormData) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  className?: string;
}

export function ReviewForm({
  productId: _productId,
  orderId: _orderId,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  className,
}: ReviewFormProps) {
  const [rating, setRating] = useState(initialData?.rating ?? 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState(initialData?.content ?? '');
  const [errors, setErrors] = useState<Partial<Record<keyof ReviewFormData, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ReviewFormData, string>> = {};

    if (rating === 0) {
      newErrors.rating = 'Please select a rating';
    }

    if (content.trim().length < 1) {
      newErrors.content = 'Review cannot be empty';
    }

    if (content.trim().length > 1000) {
      newErrors.content = 'Review must be less than 1000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    onSubmit({
      rating,
      content: content.trim(),
    });
  };

  const handleRatingClick = (value: number) => {
    setRating(value);
    if (errors.rating) {
      setErrors((prev) => ({ ...prev, rating: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-5', className)}>
      {/* Star Rating */}
      <div className="space-y-2">
        <Label className="font-body text-sm font-medium">
          Your Rating <span className="text-destructive">*</span>
        </Label>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => {
            const starValue = i + 1;
            const isActive = starValue <= (hoverRating || rating);

            return (
              <button
                key={i}
                type="button"
                onClick={() => handleRatingClick(starValue)}
                onMouseEnter={() => setHoverRating(starValue)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm transition-colors"
                aria-label={`Rate ${starValue} out of 5 stars`}
              >
                <Star
                  className={cn(
                    'w-7 h-7 transition-colors',
                    isActive
                      ? 'fill-accent text-accent'
                      : 'text-muted hover:text-muted-foreground'
                  )}
                />
              </button>
            );
          })}
          {rating > 0 && (
            <span className="ml-2 font-body text-sm text-muted-foreground">
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </span>
          )}
        </div>
        {errors.rating && (
          <p className="font-body text-xs text-destructive">{errors.rating}</p>
        )}
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Label htmlFor="review-content" className="font-body text-sm font-medium">
          Your Review <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="review-content"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (errors.content) {
              setErrors((prev) => ({ ...prev, content: undefined }));
            }
          }}
          placeholder="Tell us what you liked or disliked..."
          rows={5}
          maxLength={1000}
          className={cn(
            'font-body resize-none',
            errors.content && 'border-destructive focus-visible:ring-destructive'
          )}
        />
        <div className="flex items-center justify-end">
          {errors.content ? (
            <p className="font-body text-xs text-destructive">{errors.content}</p>
          ) : (
            <span className="font-body text-xs text-muted-foreground">
              {content.length}/1000
            </span>
          )}
        </div>
      </div>

      {/* Submit buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="font-body"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="font-body gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {initialData ? 'Update Review' : 'Submit Review'}
        </Button>
      </div>
    </form>
  );
}
