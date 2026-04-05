// components/ProductReviews.tsx
'use client';

import { useState } from 'react';
import { useProductReviews } from '@/hooks/useProductReviews';

export function ProductReviews({ productId }: { productId: string }) {
  const { reviews, loading, error } = useProductReviews(productId);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'featured' | 'recent' | 'helpful'>('featured');

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
        Failed to load reviews. Please try again later.
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-600">No reviews yet. Be the first to review this product!</p>
      </div>
    );
  }

  // Sort reviews
  const sortedReviews = [...reviews].sort((a, b) => {
    switch (sortBy) {
      case 'featured':
        // Featured first, then by priority
        if (a.is_featured !== b.is_featured) {
          return a.is_featured ? -1 : 1;
        }
        return a.display_priority - b.display_priority;

      case 'helpful':
        // Most helpful first
        return b.helpful_count - a.helpful_count;

      case 'recent':
      default:
        // Most recent first
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  // Calculate average rating
  const averageRating = (
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  ).toFixed(1);

  // Count by rating
  const ratingCounts = {
    5: reviews.filter(r => r.rating === 5).length,
    4: reviews.filter(r => r.rating === 4).length,
    3: reviews.filter(r => r.rating === 3).length,
    2: reviews.filter(r => r.rating === 2).length,
    1: reviews.filter(r => r.rating === 1).length,
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-8">Customer Reviews</h2>

      {/* Rating Summary */}
      <div className="bg-white rounded-lg p-6 mb-8 shadow-sm border border-gray-200">
        <div className="grid grid-cols-2 gap-8">
          {/* Average Rating */}
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold text-gray-900">{averageRating}</div>
            <div>
              <div className="text-lg text-yellow-500">{'⭐'.repeat(Math.round(parseFloat(averageRating)))}</div>
              <p className="text-sm text-gray-600">Based on {reviews.length} reviews</p>
            </div>
          </div>

          {/* Rating Breakdown */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => (
              <div key={stars} className="flex items-center gap-2">
                <span className="text-sm text-gray-600 w-12">{stars} ⭐</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-yellow-500 h-full rounded-full"
                    style={{
                      width: `${(ratingCounts[stars as keyof typeof ratingCounts] / reviews.length) * 100}%`
                    }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-8 text-right">
                  {ratingCounts[stars as keyof typeof ratingCounts]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sort Options */}
      <div className="mb-6 flex gap-3">
        {(['featured', 'recent', 'helpful'] as const).map((sort) => (
          <button
            key={sort}
            onClick={() => setSortBy(sort)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              sortBy === sort
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
            }`}
          >
            {sort === 'featured' && '⭐ Featured'}
            {sort === 'recent' && '📅 Recent'}
            {sort === 'helpful' && '👍 Most Helpful'}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {sortedReviews.map((review) => (
          <div
            key={review.id}
            className={`bg-white rounded-lg p-6 shadow-sm border-l-4 ${
              review.is_featured ? 'border-l-yellow-500 ring-1 ring-yellow-200' : 'border-l-gray-300'
            }`}
          >
            {/* Featured Badge */}
            {review.is_featured && (
              <div className="inline-block mb-3 px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                ⭐ Featured Review
              </div>
            )}

            {/* Review Header */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{review.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-yellow-500">{'⭐'.repeat(review.rating)}</span>
                  <span className="text-sm text-gray-600">{review.rating}/5</span>
                  {review.is_verified_purchase && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                      ✓ Verified Purchase
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Review Content */}
            <p
              className={`text-gray-700 leading-relaxed ${
                expandedReview === review.id ? '' : 'line-clamp-3'
              }`}
            >
              {review.content}
            </p>

            {review.content.length > 300 && (
              <button
                onClick={() =>
                  setExpandedReview(expandedReview === review.id ? null : review.id)
                }
                className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2"
              >
                {expandedReview === review.id ? 'Read Less' : 'Read More'}
              </button>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-3">
                {/* User Avatar Placeholder */}
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-xs font-semibold text-gray-700">
                    {review.user_name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{review.user_name || 'Anonymous'}</p>
                  <p className="text-gray-600">
                    {new Date(review.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Helpful Count */}
              {review.helpful_count > 0 && (
                <span className="text-sm text-gray-600">
                  👍 {review.helpful_count} found this helpful
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CTA to Write Review */}
      <div className="mt-8 text-center">
        <p className="text-gray-600 mb-4">Have you used this product?</p>
        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
          Write a Review
        </button>
      </div>
    </div>
  );
}
