// hooks/useProductReviews.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface ReviewData {
  id: string;
  rating: number;
  title: string;
  content: string;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  user_name: string;
  user_avatar: string | null;
  is_featured: boolean;
  display_priority: number;
}

export function useProductReviews(productId: string) {
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id ?? null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: fetchError } = await (supabase as any)
        .rpc('get_product_reviews_user', {
          p_product_id: productId,
          p_user_id: currentUserId,
        });

      if (fetchError) throw fetchError;

      setReviews(data || []);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch reviews'));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (!productId) {
      setReviews([]);
      setLoading(false);
      return;
    }

    fetchReviews();
  }, [productId, fetchReviews]);

  return { reviews, loading, error, refetch: fetchReviews };
}
