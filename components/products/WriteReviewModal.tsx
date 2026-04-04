'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ReviewForm, ReviewFormData } from './ReviewForm';

interface WriteReviewModalProps {
  productId: string;
  productName: string;
  orderId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReviewFormData) => void;
  isSubmitting?: boolean;
  editReview?: {
    id: string;
    rating: number;
    title: string;
    content: string;
  } | null;
}

export function WriteReviewModal({
  productId,
  productName,
  orderId,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  editReview,
}: WriteReviewModalProps) {
  const handleSubmit = (data: ReviewFormData) => {
    onSubmit(data);
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {editReview ? 'Edit Your Review' : 'Write a Review'}
          </DialogTitle>
          <DialogDescription className="font-body text-sm">
            Share your thoughts about <span className="font-medium text-foreground">{productName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <ReviewForm
            productId={productId}
            orderId={orderId}
            initialData={editReview ? {
              rating: editReview.rating,
              content: editReview.content,
            } : undefined}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
