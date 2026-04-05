import { logger } from '@/lib/logger';
import { createClient } from './client';
import type { Tables } from '@/types/database';

export type Notification = Tables<'notifications'>;

/**
 * Get notifications for the current user
 */
export async function getNotifications(
  supabase = createClient()
): Promise<{ data: Notification[] | null; error: Error | null }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: null };
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    logger.error('Failed to fetch notifications:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Get count of unread notifications (pending status)
 */
export async function getUnreadCount(supabase = createClient()) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { count: 0, error: null };
  }

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'pending');

  if (error) {
    logger.error('Failed to fetch unread notification count:', error);
    return { count: 0, error };
  }

  return { count: count || 0, error: null };
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(
  notificationId: string,
  supabase = createClient()
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // First verify the notification belongs to this user
  const { data: notification, error: fetchError } = await supabase
    .from('notifications')
    .select('id, user_id')
    .eq('id', notificationId)
    .maybeSingle();

  if (fetchError) {
    logger.error('Failed to verify notification ownership:', fetchError);
    throw new Error('Failed to verify notification');
  }

  if (!notification || notification.user_id !== user.id) {
    throw new Error('Notification not found or unauthorized');
  }

  // Mark as sent (which counts as "read" for our purposes)
  const { error } = await supabase.rpc('mark_notification_sent', {
    p_notification_id: notificationId,
    p_provider_response: null,
  });

  if (error) {
    logger.error('Failed to mark notification as read:', error);
    throw new Error('Failed to mark notification as read');
  }

  return { success: true };
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(supabase = createClient()) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get all pending notifications for this user
  const { data: notifications, error: fetchError } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending');

  if (fetchError) {
    logger.error('Failed to fetch notifications for mark all as read:', fetchError);
    throw new Error('Failed to fetch notifications');
  }

  // Mark each as read via RPC function
  const results = await Promise.allSettled(
    notifications.map((n) =>
      supabase.rpc('mark_notification_sent', {
        p_notification_id: n.id,
        p_provider_response: null,
      })
    )
  );

  const errors = results.filter((r) => r.status === 'rejected');
  if (errors.length > 0) {
    logger.error('Some notifications failed to mark as read:', errors);
    throw new Error('Some notifications failed to mark as read');
  }

  return { success: true, marked: notifications.length };
}

/**
 * Subscribe to real-time notification updates
 */
export function subscribeToNotifications(
  user: { id: string } | null,
  callback: (notification: Notification | null) => void
) {
  if (!user) {
    logger.warn('Cannot subscribe to notifications - no user session');
    return { unsubscribe: () => {}, error: 'No user session' };
  }

  const supabase = createClient();

  const channel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => {
        callback(payload.new as Notification);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => {
        callback(payload.new as Notification);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.debug('Subscribed to notifications');
      } else if (status === 'CHANNEL_ERROR') {
        logger.error('Notification subscription error');
      } else if (status === 'TIMED_OUT') {
        logger.warn('Notification subscription timed out');
      }
    });

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

/**
 * Clear all notifications (soft delete - keep for history but mark as deleted)
 */
export async function clearAllNotifications(supabase = createClient()) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    logger.error('Failed to clear notifications:', error);
    throw new Error('Failed to clear notifications');
  }

  return { success: true };
}

/**
 * Get notification icon based on type
 */
export function getNotificationIcon(type: Notification['type']) {
  const icons: Record<Notification['type'], string> = {
    order_confirmation: 'Package',
    payment_success: 'CheckCircle',
    payment_failed: 'AlertCircle',
    order_shipped: 'Truck',
    order_delivered: 'PackageCheck',
    order_cancelled: 'XCircle',
    custom_quote_approved: 'ThumbsUp',
    custom_quote_rejected: 'ThumbsDown',
    verification: 'ShieldCheck',
    marketing: 'Megaphone',
  };

  return icons[type] || 'Bell';
}

/**
 * Get notification title based on type
 */
export function getNotificationTitle(type: Notification['type'], subject?: string | null) {
  if (subject) return subject;

  const titles: Record<Notification['type'], string> = {
    order_confirmation: 'Order Placed',
    payment_success: 'Payment Successful',
    payment_failed: 'Payment Failed',
    order_shipped: 'Order Shipped',
    order_delivered: 'Order Delivered',
    order_cancelled: 'Order Cancelled',
    custom_quote_approved: 'Quote Approved',
    custom_quote_rejected: 'Quote Rejected',
    verification: 'Account Verification',
    marketing: 'Special Offer',
  };

  return titles[type] || 'Notification';
}
