// app/admin/reviews/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Tables } from '@/types/database';
import { AdminReviewFilters } from '@/components/admin/AdminReviewFilters';
import { AdminReviewList } from '@/components/admin/AdminReviewList';
import { AdminReviewAuditLog } from '@/components/admin/AdminReviewAuditLog';

type ProductReview = Tables<'product_reviews'>;
type ReviewVisibility = Tables<'review_visibility'>;

interface ReviewWithVisibility extends ProductReview {
  review_visibility: ReviewVisibility | null;
  product?: { id: string; name: string };
  user?: { id: string; full_name: string; email: string };
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewWithVisibility[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<ReviewWithVisibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(new Set());
  const [showAuditLog, setShowAuditLog] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    productId: '',
    customerName: '',
    ratingFilter: 'all', // all, 5star, 4star, etc.
    statusFilter: 'all', // all, pending, approved, rejected
    visibilityFilter: 'all', // all, visible, hidden
    dateFrom: '',
    dateTo: '',
    searchQuery: ''
  });

  // Load reviews on mount
  useEffect(() => {
    loadReviews();
  }, []);

  // Apply filters when filter state changes
  useEffect(() => {
    applyFilters();
  }, [filters, reviews]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const { data: reviewsData, error } = await supabase
        .from('product_reviews')
        .select(`
          *,
          review_visibility (*),
          product:products(id, name),
          user:profiles(id, full_name, email)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(reviewsData as unknown as ReviewWithVisibility[]);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...reviews];

    // Filter by product
    if (filters.productId) {
      filtered = filtered.filter(r => r.product?.id === filters.productId);
    }

    // Filter by customer name
    if (filters.customerName) {
      filtered = filtered.filter(r =>
        r.user?.full_name?.toLowerCase().includes(filters.customerName.toLowerCase()) ||
        r.user?.email?.toLowerCase().includes(filters.customerName.toLowerCase())
      );
    }

    // Filter by rating
    if (filters.ratingFilter !== 'all') {
      const targetRating = parseInt(filters.ratingFilter);
      filtered = filtered.filter(r => r.rating === targetRating);
    }

    // Filter by status
    if (filters.statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === filters.statusFilter);
    }

    // Filter by visibility
    if (filters.visibilityFilter !== 'all') {
      filtered = filtered.filter(r => {
        if (filters.visibilityFilter === 'visible') {
          return r.review_visibility?.is_visible !== false;
        } else if (filters.visibilityFilter === 'hidden') {
          return r.review_visibility?.is_visible === false;
        }
        return true;
      });
    }

    // Filter by date range
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(r => new Date(r.created_at) >= fromDate);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59);
      filtered = filtered.filter(r => new Date(r.created_at) <= toDate);
    }

    // Full-text search
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.title?.toLowerCase().includes(query) ||
        r.content?.toLowerCase().includes(query) ||
        r.user?.full_name?.toLowerCase().includes(query)
      );
    }

    setFilteredReviews(filtered);
  };

  const handleToggleVisibility = async (reviewId: string, currentVisibility: boolean) => {
    try {
      const { error } = await supabase
        .from('review_visibility')
        .update({
          is_visible: !currentVisibility,
          admin_notes: `Toggled by admin - was ${currentVisibility ? 'visible' : 'hidden'}`
        })
        .eq('review_id', reviewId);

      if (error) throw error;

      // Update local state
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
      console.error('Failed to toggle visibility:', err);
    }
  };

  const handleSetPriority = async (reviewId: string, priority: number) => {
    try {
      const { error } = await supabase
        .from('review_visibility')
        .update({
          display_priority: priority,
          admin_notes: `Priority set to ${priority}`
        })
        .eq('review_id', reviewId);

      if (error) throw error;

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
      console.error('Failed to set priority:', err);
    }
  };

  const handleSetPlacement = async (reviewId: string, placement: 'featured' | 'normal' | 'hidden') => {
    try {
      const { error } = await supabase
        .from('review_visibility')
        .update({
          placement_type: placement,
          admin_notes: `Placement changed to ${placement}`
        })
        .eq('review_id', reviewId);

      if (error) throw error;

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
      console.error('Failed to set placement:', err);
    }
  };

  const handleApproveReview = async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from('product_reviews')
        .update({ status: 'approved' })
        .eq('id', reviewId);

      if (error) throw error;

      setReviews(reviews.map(r =>
        r.id === reviewId ? { ...r, status: 'approved' } : r
      ));
    } catch (err) {
      console.error('Failed to approve review:', err);
    }
  };

  const handleRejectReview = async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from('product_reviews')
        .update({ status: 'rejected' })
        .eq('id', reviewId);

      if (error) throw error;

      setReviews(reviews.map(r =>
        r.id === reviewId ? { ...r, status: 'rejected' } : r
      ));
    } catch (err) {
      console.error('Failed to reject review:', err);
    }
  };

  const handleBulkToggleVisibility = async () => {
    try {
      for (const reviewId of Array.from(selectedReviews)) {
        const review = reviews.find(r => r.id === reviewId);
        if (review?.review_visibility) {
          await supabase
            .from('review_visibility')
            .update({ is_visible: !review.review_visibility.is_visible })
            .eq('review_id', reviewId);
        }
      }
      setSelectedReviews(new Set());
      loadReviews();
    } catch (err) {
      console.error('Bulk operation failed:', err);
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
    if (selectedReviews.size === filteredReviews.length) {
      setSelectedReviews(new Set());
    } else {
      setSelectedReviews(new Set(filteredReviews.map(r => r.id)));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Review Management</h1>
          <p className="text-gray-600 mt-2">
            Approve, reject, and control visibility of customer reviews
          </p>
        </div>

        {/* Filters */}
        <AdminReviewFilters filters={filters} setFilters={setFilters} />

        {/* Stats */}
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

        {/* Bulk Actions */}
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

        {/* Audit Log Toggle */}
        <button
          onClick={() => setShowAuditLog(!showAuditLog)}
          className="mb-6 text-blue-600 hover:text-blue-800 underline text-sm font-medium"
        >
          {showAuditLog ? 'Hide' : 'Show'} Change Log
        </button>

        {showAuditLog && <AdminReviewAuditLog />}

        {/* Review List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin">⏳</div>
            <p className="text-gray-600 mt-4">Loading reviews...</p>
          </div>
        ) : (
          <AdminReviewList
            reviews={filteredReviews}
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
      </div>
    </div>
  );
}
