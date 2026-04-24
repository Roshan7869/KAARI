'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Download } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';

interface Order {
  id: string;
  order_number: string | null;
  status: string;
  total_amount: number | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
}

const columns: ColumnDef<Order, unknown>[] = [
  {
    accessorKey: 'order_number',
    header: 'Order #',
    cell: ({ row }) => {
      const order = row.original;
      return (
        <Link href={`/admin/orders/${order.id}`} className="font-medium hover:underline">
          #{order.order_number || order.id.slice(0, 8)}
        </Link>
      );
    },
  },
  {
    accessorKey: 'profiles.full_name',
    header: 'Customer',
    cell: ({ row }) => row.original.profiles?.full_name || 'Guest',
  },
  {
    accessorKey: 'total_amount',
    header: 'Total',
    cell: ({ row }) => `₹${(row.original.total_amount || 0).toLocaleString('en-IN')}`,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      const colors: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-800',
        processing: 'bg-blue-100 text-blue-800',
        shipped: 'bg-purple-100 text-purple-800',
        delivered: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
        paid: 'bg-green-100 text-green-800',
      };
      return <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>{status}</Badge>;
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Date',
    cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Button variant="outline" size="sm" asChild>
        <Link href={`/admin/orders/${row.original.id}`}>View</Link>
      </Button>
    ),
  },
];

export default function AdminOrders() {
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, total_amount, created_at, profiles(full_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 30,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground">Orders</h1>
          <p className="font-body text-muted-foreground mt-1">View and manage customer orders</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open('/api/admin/export?type=orders', '_blank')}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button size="sm" className="gap-2" asChild>
            <Link href="/admin/orders/new"><Plus className="w-4 h-4" /> New Order</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg">All Orders</h2>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={orders} searchKey="order_number" isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}