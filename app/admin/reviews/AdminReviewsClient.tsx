// app/admin/reviews/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger-client';
import { AdminReviewFilters } from '@/components/admin/AdminReviewFilters';
import { AdminReviewList } from '@/components/admin/AdminReviewList';
import { AdminReviewAuditLog } from '@/components/admin/AdminReviewAuditLog';

import type { Tables } from '@/types/database';

type ProductReview = Tables<'product_reviews'>;
type ReviewVisibility = Tables<'review_visibility'>;

interface ReviewWithVisibility extends ProductReview {
  review_visibility: ReviewVisibility | null;
  product?: { id: string; name: string };
  user?: { id: string; full_name: string; email: string };
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewWithVisibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(new Set());
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    productId: '',
    customerName: '',
    ratingFilter: 'all',
    statusFilter: 'all',
    visibilityFilter: 'all',
    dateFrom: '',
    dateTo: '',
    searchQuery: ''
  });

  const loadReviews = useCallback(async (targetPage?: number) => {
    try {
      setLoading(true);
      const currentPage = targetPage ?? page;
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: '25',
        ...filters,
      });
      const res = await fetch(`/api/admin/reviews?${params.toString()}`, { cache: 'no-store' });
      const payload = await res.json() as {
        reviews?: ReviewWithVisibility[];
        error?: string;
        pagination?: { hasNextPage?: boolean };
      };

      if (!res.ok) {
        throw new Error(payload.error || 'Failed to load reviews');
      }

      setReviews(payload.reviews ?? []);
      setHasNextPage(Boolean(payload.pagination?.hasNextPage));
    } catch (err) {
      logger.error('Failed to load reviews', err, { context: 'admin-reviews' });
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews, page]);

  // All mutations go through server API routes with requireAdmin()

  const handleToggleVisibility = async (reviewId: string, currentVisibility: boolean) => {
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_visible: !currentVisibility,
          admin_notes: `Toggled by admin - was ${currentVisibility ? 'visible' : 'hidden'}`,
        }),
      });
      if (!res.ok) throw new Error('Failed to toggle visibility');

      setReviews(reviews.map(r =>
        r.id === reviewId
          ? {
            ...r,
            review_visibility: r.review_visibility
              ? { ...r.review_visibility, is_visible: !currentVisibility }
              : null
          }
          : r
      ));
    } catch (err) {
      logger.error('Failed to toggle visibility', err, { context: 'admin-reviews' });
    }
  };

  const handleSetPriority = async (reviewId: string, priority: number) => {
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_priority: priority,
          admin_notes: `Priority set to ${priority}`,
        }),
      });
      if (!res.ok) throw new Error('Failed to set priority');

      setReviews(reviews.map(r =>
        r.id === reviewId
          ? {
            ...r,
            review_visibility: r.review_visibility
              ? { ...r.review_visibility, display_priority: priority }
              : null
          }
          : r
      ));
    } catch (err) {
      logger.error('Failed to set priority', err, { context: 'admin-reviews' });
    }
  };

  const handleSetPlacement = async (reviewId: string, placement: 'featured' | 'normal' | 'hidden') => {
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placement_type: placement,
          admin_notes: `Placement changed to ${placement}`,
        }),
      });
      if (!res.ok) throw new Error('Failed to set placement');

      setReviews(reviews.map(r =>
        r.id === reviewId
          ? {
            ...r,
            review_visibility: r.review_visibility
              ? { ...r.review_visibility, placement_type: placement }
              : null
          }
          : r
      ));
    } catch (err) {
      logger.error('Failed to set placement', err, { context: 'admin-reviews' });
    }
  };

  const handleApproveReview = async (reviewId: string) => {
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      if (!res.ok) throw new Error('Failed to approve review');

      setReviews(reviews.map(r =>
        r.id === reviewId ? { ...r, status: 'approved' } : r
      ));
    } catch (err) {
      logger.error('Failed to approve review', err, { context: 'admin-reviews' });
    }
  };

  const handleRejectReview = async (reviewId: string) => {
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });
      if (!res.ok) throw new Error('Failed to reject review');

      setReviews(reviews.map(r =>
        r.id === reviewId ? { ...r, status: 'rejected' } : r
      ));
    } catch (err) {
      logger.error('Failed to reject review', err, { context: 'admin-reviews' });
    }
  };

  const handleBulkToggleVisibility = async () => {
    try {
      const res = await fetch(`/api/admin/reviews/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk-toggle-visibility',
          reviewIds: Array.from(selectedReviews),
        }),
      });
      if (!res.ok) throw new Error('Bulk toggle failed');

      setSelectedReviews(new Set());
      await loadReviews();
    } catch (err) {
      logger.error('Bulk operation failed', err, { context: 'admin-reviews' });
    }
  };

  const handleSelectReview = (reviewId: string) => {
    const newSelection = new Set(selectedReviews);
    if (newSelection.has(reviewId)) {
      newSelection.delete(reviewId);
    } else {
      newSelection.add(reviewId);
    }
    setSelectedReviews(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedReviews.size === reviews.length) {
      setSelectedReviews(new Set());
    } else {
      setSelectedReviews(new Set(reviews.map(r => r.id)));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Review Management</h1>
          <p className="text-gray-600 mt-2">
            Approve, reject, and control visibility of customer reviews
          </p>
        </div>

        <AdminReviewFilters filters={filters} setFilters={setFilters} />

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded p-4 shadow">
            <div className="text-sm text-gray-600">Total Reviews</div>
            <div className="text-2xl font-bold">{reviews.length}</div>
          </div>
          <div className="bg-white rounded p-4 shadow">
            <div className="text-sm text-gray-600">Visible</div>
            <div className="text-2xl font-bold text-green-600">
              {reviews.filter(r => r.review_visibility?.is_visible !== false).length}
            </div>
          </div>
          <div className="bg-white rounded p-4 shadow">
            <div className="text-sm text-gray-600">Hidden</div>
            <div className="text-2xl font-bold text-red-600">
              {reviews.filter(r => r.review_visibility?.is_visible === false).length}
            </div>
          </div>
          <div className="bg-white rounded p-4 shadow">
            <div className="text-sm text-gray-600">Pending Approval</div>
            <div className="text-2xl font-bold text-yellow-600">
              {reviews.filter(r => r.status === 'pending').length}
            </div>
          </div>
        </div>

        {selectedReviews.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6 flex items-center justify-between">
            <div className="text-sm font-semibold text-blue-900">
              {selectedReviews.size} review(s) selected
            </div>
            <div className="space-x-2">
              <button
                onClick={handleBulkToggleVisibility}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium"
              >
                Toggle Visibility for Selected
              </button>
              <button
                onClick={() => setSelectedReviews(new Set())}
                className="bg-gray-300 text-gray-900 px-4 py-2 rounded hover:bg-gray-400 text-sm font-medium"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowAuditLog(!showAuditLog)}
          className="mb-6 text-blue-600 hover:text-blue-800 underline text-sm font-medium"
        >
          {showAuditLog ? 'Hide' : 'Show'} Change Log
        </button>

        {showAuditLog && <AdminReviewAuditLog />}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin">⏳</div>
            <p className="text-gray-600 mt-4">Loading reviews...</p>
          </div>
        ) : (
          <AdminReviewList
            reviews={reviews}
            selectedReviews={selectedReviews}
            onSelectReview={handleSelectReview}
            onSelectAll={handleSelectAll}
            onToggleVisibility={handleToggleVisibility}
            onSetPriority={handleSetPriority}
            onSetPlacement={handleSetPlacement}
            onApproveReview={handleApproveReview}
            onRejectReview={handleRejectReview}
          />
        )}
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">Page {page}</span>
          <button
            type="button"
            disabled={!hasNextPage || loading}
            onClick={() => setPage((prev) => prev + 1)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
