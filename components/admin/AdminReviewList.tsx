// components/admin/AdminReviewList.tsx
'use client';

import { Tables } from '@/types/database';
import Image from 'next/image';

type ProductReview = Tables<'product_reviews'>;
type ReviewVisibility = Tables<'review_visibility'>;

interface ReviewWithVisibility extends ProductReview {
  review_visibility: ReviewVisibility | null;
  product?: { id: string; name: string };
  user?: { id: string; full_name: string; email: string };
}

export function AdminReviewList({
  reviews,
  selectedReviews,
  onSelectReview,
  onSelectAll,
  onToggleVisibility,
  onSetPriority,
  onSetPlacement,
  onApproveReview,
  onRejectReview,
}: {
  reviews: ReviewWithVisibility[];
  selectedReviews: Set<string>;
  onSelectReview: (id: string) => void;
  onSelectAll: () => void;
  onToggleVisibility: (id: string, currentVisibility: boolean) => void;
  onSetPriority: (id: string, priority: number) => void;
  onSetPlacement: (id: string, placement: 'featured' | 'normal' | 'hidden') => void;
  onApproveReview: (id: string) => void;
  onRejectReview: (id: string) => void;
}) {
  if (reviews.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600">No reviews found matching your filters.</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPlacementBadge = (placement: string) => {
    const colors: Record<string, string> = {
      featured: 'bg-blue-100 text-blue-800 border-l-4 border-blue-600',
      normal: 'bg-gray-100 text-gray-800',
      hidden: 'bg-red-100 text-red-800',
    };
    return colors[placement] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      {/* Select All */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3 border-b">
        <input
          type="checkbox"
          id="select-all-reviews"
          checked={selectedReviews.size === reviews.length && reviews.length > 0}
          onChange={onSelectAll}
          className="w-4 h-4 cursor-pointer"
          aria-label="Select all reviews"
        />
        <span className="text-sm font-medium text-gray-700">
          {selectedReviews.size === reviews.length && reviews.length > 0
            ? 'All selected'
            : `Select all ${reviews.length} reviews`}
        </span>
      </div>

      {/* Review Cards */}
      {reviews.map((review) => (
        <div key={review.id} className="bg-white rounded-lg shadow p-6 border-l-4 border-gray-200">
          {/* Header with Checkbox */}
          <div className="flex items-start gap-4 mb-4">
            <input
              type="checkbox"
              id={`review-select-${review.id}`}
              checked={selectedReviews.has(review.id)}
              onChange={() => onSelectReview(review.id)}
              className="w-5 h-5 mt-1 cursor-pointer"
              aria-label={`Select review: ${review.title}`}
            />

            <div className="flex-1">
              {/* Title and Rating */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{review.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-yellow-500">{'⭐'.repeat(review.rating)}</span>
                    <span className="text-sm text-gray-600">
                      {review.rating}/5 {review.is_verified_purchase && '✓ Verified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <p className="text-gray-700 mt-3 line-clamp-2">{review.content}</p>

              {/* Metadata */}
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-600 flex-wrap">
                <span>By: <strong>{review.user?.full_name}</strong></span>
                <span>Product: <strong>{review.product?.name || 'N/A'}</strong></span>
                <span>Date: <strong>{new Date(review.created_at).toLocaleDateString()}</strong></span>
              </div>
            </div>

            {/* Status Badge */}
            <div className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusBadge(review.status)}`}>
              {review.status}
            </div>
          </div>

          {/* Admin Controls */}
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
            {/* Approval Actions (show if pending) */}
            {review.status === 'pending' && (
              <div className="flex gap-2">
                <button
                  onClick={() => onApproveReview(review.id)}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-medium text-sm"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => onRejectReview(review.id)}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 font-medium text-sm"
                >
                  ✗ Reject
                </button>
              </div>
            )}

            {/* Visibility & Placement Controls (show if approved) */}
            {review.status === 'approved' && (
              <div className="grid grid-cols-3 gap-3">
                {/* Toggle Visibility */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Visibility</label>
                  <button
                    onClick={() =>
                      onToggleVisibility(
                        review.id,
                        review.review_visibility?.is_visible !== false
                      )
                    }
                    className={`w-full px-3 py-2 rounded text-sm font-medium transition ${
                      review.review_visibility?.is_visible !== false
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                  >
                    {review.review_visibility?.is_visible !== false ? '👁️ Visible' : '🔒 Hidden'}
                  </button>
                </div>

                {/* Placement Type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Placement</label>
                  <select
                    id={`placement-${review.id}`}
                    value={review.review_visibility?.placement_type || 'normal'}
                    onChange={(e) =>
                      onSetPlacement(review.id, e.target.value as 'featured' | 'normal' | 'hidden')
                    }
                    title="Select review placement type"
                    aria-label="Review placement type"
                    className={`w-full px-3 py-2 rounded text-sm font-medium border-none ${getPlacementBadge(review.review_visibility?.placement_type || 'normal')}`}
                  >
                    <option value="featured">⭐ Featured</option>
                    <option value="normal">📄 Normal</option>
                    <option value="hidden">🔒 Hidden</option>
                  </select>
                </div>

                {/* Display Priority */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Display Order (1=top)
                  </label>
                  <input
                    type="number"
                    id={`priority-${review.id}`}
                    min="1"
                    max="999"
                    value={review.review_visibility?.display_priority || 999}
                    onChange={(e) => onSetPriority(review.id, parseInt(e.target.value) || 999)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    aria-label="Display priority (1=top)"
                  />
                </div>
              </div>
            )}

            {/* Admin Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Admin Notes</label>
              <textarea
                value={review.review_visibility?.admin_notes || ''}
                placeholder="Add internal notes about this review..."
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm h-20 resize-none"
                disabled
              />
            </div>
          </div>

          {/* Last Modified Info */}
          {review.review_visibility?.last_modified_at && (
            <div className="mt-3 text-xs text-gray-500">
              Last modified: {new Date(review.review_visibility.last_modified_at).toLocaleString()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
