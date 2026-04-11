'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Package, AlertTriangle, Check } from 'lucide-react';
import Link from 'next/link';

interface Variant {
  id: string;
  sku: string | null;
  size: string | null;
  color: string | null;
  material: string | null;
  price: number;
  stock_qty: number;
  is_active: boolean;
  products: { id: string; title: string; slug: string; category: string | null; is_active: boolean } | null;
}

export default function AdminInventory() {
  const [search, setSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const queryClient = useQueryClient();

  const { data: variants = [], isLoading } = useQuery<Variant[]>({
    queryKey: ['admin-inventory', search, lowStockFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (lowStockFilter) params.set('low_stock', 'true');
      const res = await fetch(`/api/admin/inventory?${params}`);
      if (!res.ok) throw new Error('Failed to fetch inventory');
      const data = await res.json();
      return data.variants;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, stock_qty }: { id: string; stock_qty: number }) => {
      const res = await fetch(`/api/admin/inventory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_qty }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update stock');
      }
    },
    onSuccess: () => {
      toast.success('Stock updated');
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function startEdit(v: Variant) {
    setEditingId(v.id);
    setEditQty(v.stock_qty);
  }

  function saveEdit(id: string) {
    updateMutation.mutate({ id, stock_qty: editQty });
  }

  const lowCount = variants.filter(v => v.stock_qty < 5).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground">Inventory</h1>
          <p className="font-body text-muted-foreground mt-1">Manage product stock levels</p>
        </div>
        {lowCount > 0 && (
          <div className="flex items-center gap-2 text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">{lowCount} variant{lowCount !== 1 ? 's' : ''} low in stock</span>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by SKU..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={lowStockFilter ? 'default' : 'outline'}
              onClick={() => setLowStockFilter(f => !f)}
              className="gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Low Stock Only
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading inventory...</div>
          ) : variants.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No variants found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-semibold text-muted-foreground">Product</th>
                    <th className="pb-3 font-semibold text-muted-foreground">SKU</th>
                    <th className="pb-3 font-semibold text-muted-foreground">Variant</th>
                    <th className="pb-3 font-semibold text-muted-foreground">Price</th>
                    <th className="pb-3 font-semibold text-muted-foreground">Stock</th>
                    <th className="pb-3 font-semibold text-muted-foreground">Status</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {variants.map(v => (
                    <tr key={v.id} className={v.stock_qty < 5 ? 'bg-orange-50/50' : ''}>
                      <td className="py-3 pr-4">
                        <Link
                          href={`/admin/products?edit=${v.products?.id}`}
                          className="font-medium hover:underline"
                        >
                          {v.products?.title || '—'}
                        </Link>
                        {v.products?.category && (
                          <span className="block text-xs text-muted-foreground">{v.products.category}</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs">{v.sku || '—'}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {v.size && <Badge variant="outline" className="text-xs">{v.size}</Badge>}
                          {v.color && <Badge variant="outline" className="text-xs">{v.color}</Badge>}
                          {v.material && <Badge variant="outline" className="text-xs">{v.material}</Badge>}
                          {!v.size && !v.color && !v.material && <span className="text-muted-foreground">Base</span>}
                        </div>
                      </td>
                      <td className="py-3 pr-4">₹{v.price}</td>
                      <td className="py-3 pr-4">
                        {editingId === v.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              value={editQty}
                              onChange={e => setEditQty(parseInt(e.target.value) || 0)}
                              className="w-20 h-7 text-sm"
                              autoFocus
                              onKeyDown={e => { if (e.key === 'Enter') saveEdit(v.id); if (e.key === 'Escape') setEditingId(null); }}
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(v.id)} disabled={updateMutation.isPending}>
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(v)}
                            className={`font-medium hover:underline cursor-pointer ${v.stock_qty < 5 ? 'text-orange-600' : v.stock_qty === 0 ? 'text-red-600' : ''}`}
                          >
                            {v.stock_qty}
                            {v.stock_qty < 5 && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                          </button>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {v.stock_qty === 0
                          ? <Badge variant="destructive">Out of stock</Badge>
                          : v.stock_qty < 5
                          ? <Badge className="bg-orange-100 text-orange-800 border-orange-200">Low stock</Badge>
                          : <Badge variant="secondary">In stock</Badge>}
                      </td>
                      <td className="py-3 text-right">
                        {editingId !== v.id && (
                          <Button size="sm" variant="ghost" onClick={() => startEdit(v)}>
                            Edit
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
