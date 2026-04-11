'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ShieldCheck, RefreshCw } from 'lucide-react';

interface AuditEntry {
  id: string;
  admin_id: string;
  admin_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800 border-green-200',
  update: 'bg-blue-100 text-blue-800 border-blue-200',
  delete: 'bg-red-100 text-red-800 border-red-200',
  upload: 'bg-purple-100 text-purple-800 border-purple-200',
  export: 'bg-orange-100 text-orange-800 border-orange-200',
  import: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  login:  'bg-gray-100 text-gray-700 border-gray-200',
};

export default function AdminAuditLog() {
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const { data, isLoading, refetch } = useQuery<{ entries: AuditEntry[]; pagination: { total: number; totalPages: number } }>({
    queryKey: ['admin-audit-log', search, entityFilter, actionFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('admin_email', search);
      if (entityFilter !== 'all') params.set('entity_type', entityFilter);
      if (actionFilter !== 'all') params.set('action', actionFilter);
      params.set('page', String(page + 1)); // API is 1-indexed
      params.set('limit', String(PAGE_SIZE));
      const res = await fetch(`/api/admin/audit?${params}`);
      if (!res.ok) throw new Error('Failed to fetch audit log');
      return res.json();
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  const logs = data?.entries ?? [];
  const total = data?.pagination?.total ?? 0;

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-primary" />
            Audit Log
          </h1>
          <p className="font-body text-muted-foreground mt-1">
            All admin actions recorded for compliance and debugging
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by admin email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>
            <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(0); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Entity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="order">Order</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="coupon">Coupon</SelectItem>
                <SelectItem value="billboard">Billboard</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="settings">Settings</SelectItem>
                <SelectItem value="template">Email Template</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="upload">Upload</SelectItem>
                <SelectItem value="export">Export</SelectItem>
                <SelectItem value="import">Import</SelectItem>
              </SelectContent>
            </Select>
            {total > 0 && (
              <Badge variant="secondary" className="font-body text-xs">
                {total.toLocaleString('en-IN')} entries
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading audit log...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No audit entries found
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors text-sm"
                >
                  {/* Action badge */}
                  <span className={`shrink-0 mt-0.5 text-xs font-medium px-2 py-0.5 rounded border capitalize ${ACTION_COLORS[entry.action] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                    {entry.action}
                  </span>

                  {/* Entity info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium capitalize text-foreground">
                        {entry.entity_type}
                      </span>
                      {entry.entity_label && (
                        <span className="text-muted-foreground truncate max-w-[220px]">
                          — {entry.entity_label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                      <span>{entry.admin_email ?? entry.admin_id.slice(0, 12) + '...'}</span>
                      {entry.ip_address && <span className="font-mono">{entry.ip_address}</span>}
                      <span>{formatDate(entry.created_at)}</span>
                    </div>
                  </div>

                  {/* Entity type badge */}
                  <Badge variant="outline" className="shrink-0 text-xs capitalize">
                    {entry.entity_type}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground font-body">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= total}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
