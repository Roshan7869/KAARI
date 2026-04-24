'use client';

import { logger } from '@/lib/logger-client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Package, CheckCircle, AlertCircle, Truck, PackageCheck, XCircle, ThumbsUp, ThumbsDown, Megaphone, ShieldCheck, Trash2, Check, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, clearAllNotifications, subscribeToNotifications, type Notification, getNotificationIcon, getNotificationTitle } from '@/lib/supabase/notifications';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { toast } from 'sonner';

interface NotificationCenterProps {
  className?: string;
}

export default function NotificationCenter({ className }: NotificationCenterProps) {
  const { user, loading: authLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(() => []);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications on mount and when user changes
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [notificationsData, unreadData] = await Promise.all([
        getNotifications(),
        getUnreadCount(),
      ]);

      if (notificationsData.data) {
        setNotifications(notificationsData.data);
      }
      if (unreadData.count !== undefined) {
        setUnreadCount(unreadData.count);
      }
    } catch (error) {
      logger.error('Failed to fetch notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Refetch when user changes or dropdown opens
  useEffect(() => {
    if (!authLoading && user) {
      fetchNotifications();
    }
  }, [user, authLoading, fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const { unsubscribe } = subscribeToNotifications(user, (newNotification) => {
      if (newNotification) {
        setNotifications((prev) => [newNotification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Mark as read when notification is clicked
  const handleNotificationClick = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, status: 'sent' as const } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAllAsRead(true);
      await markAllAsRead();
      await fetchNotifications();
      toast.success('All notifications marked as read');
    } catch (error) {
      logger.error('Failed to mark all as read:', error);
      toast.error('Failed to mark all as read');
    } finally {
      setMarkingAllAsRead(false);
    }
  };

  // Clear all notifications
  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete all notifications?')) {
      return;
    }

    try {
      setClearingAll(true);
      await clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
      toast.success('All notifications cleared');
    } catch (error) {
      logger.error('Failed to clear notifications:', error);
      toast.error('Failed to clear notifications');
    } finally {
      setClearingAll(false);
    }
  };

  // Get notification icon component
  const getIconComponent = (iconName: string) => {
    const icons: Record<string, React.ElementType> = {
      Package,
      CheckCircle,
      AlertCircle,
      Truck,
      PackageCheck,
      XCircle,
      ThumbsUp,
      ThumbsDown,
      Megaphone,
      ShieldCheck,
      Bell,
    };
    const Icon = icons[iconName] || Bell;
    return <Icon className="w-5 h-5" />;
  };

  if (authLoading) {
    return (
      <div className="relative">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Bell className="w-4 h-4 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Notification Button with Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center gap-2 font-body text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        <span>Notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 w-5 h-5 bg-accent text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center animate-scale-in shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[600px] glass-card-cream rounded-lg shadow-xl overflow-hidden z-50 border border-kaari-warm-brown/20 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-kaari-warm-brown/20 bg-kaari-cream/50 flex items-center justify-between">
            <div>
              <h3 className="font-body text-sm font-semibold text-foreground">Notifications</h3>
              <p className="font-body text-xs text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markingAllAsRead}
                  className="flex items-center gap-1 text-xs font-body text-muted-foreground hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Mark all as read"
                >
                  {markingAllAsRead ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-3 h-3" />
                      <span className="hidden sm:inline">Mark all read</span>
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-[400px]">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 mx-auto text-muted-foreground animate-spin" />
                <p className="mt-2 font-body text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-kaari-cream/50 rounded-full flex items-center justify-center">
                  <Bell className="w-6 h-6 text-muted-foreground" />
                </div>
                <h4 className="font-body text-sm font-medium text-foreground">No notifications</h4>
                <p className="font-body text-xs text-muted-foreground mt-1">
                  You&apos;re all caught up with your notifications.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-kaari-warm-brown/10">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification.id)}
                    className={cn(
                      'group px-4 py-3 hover:bg-kaari-cream/50 transition-colors cursor-pointer',
                      notification.status === 'pending' && 'bg-kaari-cream/30'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div
                        className={cn(
                          'mt-1 w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                          notification.status === 'pending'
                            ? 'bg-kaari-cream text-foreground'
                            : 'bg-kaari-cream/30 text-muted-foreground'
                        )}
                      >
                        {getIconComponent(getNotificationIcon(notification.type))}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-body text-sm text-foreground truncate pr-2">
                            {getNotificationTitle(notification.type, notification.subject)}
                          </h4>
                          {notification.status === 'pending' && (
                            <span className="flex-shrink-0 w-2 h-2 bg-accent rounded-full animate-pulse" />
                          )}
                        </div>
                        <p className="font-body text-xs text-muted-foreground truncate mb-1">
                          {notification.recipient}
                        </p>
                        <p className="font-body text-xs text-muted-foreground/80 truncate">
                          {notification.content?.substring(0, 100) ||
                            'You have a new notification'}
                        </p>
                        <p className="font-body text-[10px] text-muted-foreground mt-2">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-kaari-warm-brown/20 bg-kaari-cream/30 flex items-center justify-between">
              <button
                onClick={handleClearAll}
                disabled={clearingAll}
                className="flex items-center gap-1.5 text-xs font-body text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete all notifications"
              >
                {clearingAll ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
                <span className="hidden sm:inline">Clear all</span>
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-xs font-body text-muted-foreground hover:text-foreground transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
