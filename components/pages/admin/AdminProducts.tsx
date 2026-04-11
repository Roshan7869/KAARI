'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { Plus, Edit, Search, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useDeleteProduct } from '@/hooks/useAdminProducts';

interface Product {
  id: string;
  title: string;
  slug: string;
  base_price: number;
  category: string | null;
  is_active: boolean;
}

export default function AdminProducts() {
  const [search, setSearch] = useState('');
  const deleteProduct = useDeleteProduct();

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['admin-products', search],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('id, title, slug, base_price, category, is_active')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.ilike('title', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 30,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground">Products</h1>
          <p className="font-body text-muted-foreground mt-1">
            Manage your product catalog
          </p>
        </div>
        <Link href="/admin/products/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No products found
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-sm"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-body font-medium">{product.title}</p>
                      <p className="font-body text-sm text-muted-foreground">
                        {product.category || 'Uncategorized'} • ₹{product.base_price}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`text-sm ${
                        product.is_active ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <Link href={`/admin/products/${product.id}`}>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                    {product.is_active ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteProduct.mutate(product.id)}
                        disabled={deleteProduct.isPending}
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
