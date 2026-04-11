// components/admin/AdminReviewAuditLog.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Tables } from '@/types/database';

type ReviewVisibilityAudit = Tables<'review_visibility_audit'>;

interface AuditValuePayload {
  is_visible?: boolean;
  display_priority?: number;
  placement_type?: string;
  [key: string]: unknown;
}

interface AuditEntry extends Omit<ReviewVisibilityAudit, 'old_value' | 'new_value'> {
  old_value: AuditValuePayload | null;
  new_value: AuditValuePayload | null;
  admin?: { id: string; full_name: string };
  review?: { id: string; title: string };
}

export function AdminReviewAuditLog() {
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditLog();
  }, []);

  const loadAuditLog = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('review_visibility_audit')
        .select(`
          *,
          admin:profiles(id, full_name),
          review:product_reviews(id, title)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAuditLog(data as AuditEntry[]);
    } catch (err) {
      console.error('Failed to load audit log:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      toggle: '👁️ Visibility Toggled',
      reorder: '↕️ Order Changed',
      move_product: '📦 Placement Changed',
      note_added: '📝 Note Added',
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      toggle: 'bg-blue-50 border-l-4 border-blue-500',
      reorder: 'bg-purple-50 border-l-4 border-purple-500',
      move_product: 'bg-orange-50 border-l-4 border-orange-500',
      note_added: 'bg-green-50 border-l-4 border-green-500',
    };
    return colors[action] || 'bg-gray-50 border-l-4 border-gray-500';
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Loading audit log...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Change Log</h3>

      {auditLog.length === 0 ? (
        <p className="text-gray-600 text-center py-8">No changes recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {auditLog.map((entry) => (
            <div key={entry.id} className={`p-4 rounded-lg ${getActionColor(entry.action)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">
                      {getActionLabel(entry.action)}
                    </span>
                    <span className="text-xs text-gray-600">
                      by {entry.admin?.full_name || 'Unknown Admin'}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 mb-2">
                    Review: <strong>{entry.review?.title || 'Deleted Review'}</strong>
                  </p>

                  {/* Show changes for visibility toggle */}
                  {entry.action === 'toggle' && entry.old_value && entry.new_value && (
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>
                        Visibility: <strong>{entry.old_value.is_visible ? 'Visible' : 'Hidden'}</strong>
                        {' → '}
                        <strong>{entry.new_value.is_visible ? 'Visible' : 'Hidden'}</strong>
                      </p>
                    </div>
                  )}

                  {/* Show changes for reorder */}
                  {entry.action === 'reorder' && entry.old_value && entry.new_value && (
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>
                        Priority: <strong>{entry.old_value.display_priority}</strong>
                        {' → '}
                        <strong>{entry.new_value.display_priority}</strong>
                      </p>
                    </div>
                  )}

                  {/* Show changes for placement */}
                  {entry.action === 'move_product' && entry.old_value && entry.new_value && (
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>
                        Placement: <strong>{entry.old_value.placement_type}</strong>
                        {' → '}
                        <strong>{entry.new_value.placement_type}</strong>
                      </p>
                    </div>
                  )}

                  {/* Show notes */}
                  {entry.reason && (
                    <p className="text-xs text-gray-700 italic mt-1">
                      Reason: {entry.reason}
                    </p>
                  )}
                </div>

                <div className="text-xs text-gray-600 whitespace-nowrap ml-4">
                  {new Date(entry.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={loadAuditLog}
        className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        ↻ Refresh Log
      </button>
    </div>
  );
}
