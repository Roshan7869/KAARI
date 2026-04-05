import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sanitizeSearchQuery } from '@/lib/sanitization';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Product = Tables<'products'>;
export type ProductInsert = TablesInsert<'products'>;
export type ProductUpdate = TablesUpdate<'products'>;
export type ProductVariant = Tables<'product_variants'>;
export type ProductVariantInsert = TablesInsert<'product_variants'>;
export type ProductMedia = Tables<'product_media'>;
export type ProductMediaInsert = TablesInsert<'product_media'>;

// Type for admin product list with aggregated counts
interface ProductWithCounts extends Product {
  variant_count: number;
  media_count: number;
}

interface ProductWithDetails extends Product {
  variants: ProductVariant[];
  media: ProductMedia[];
}

interface ProductListParams {
  search?: string;
  category?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export function useAdminProducts(params: ProductListParams = {}) {
  const { search, category, isActive, page = 1, limit = 20 } = params;

  return useQuery({
    queryKey: ['admin-products', params],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          variants:product_variants(count),
          media:product_media(count)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (search) {
        // Sanitize search query to prevent SQL injection
        const sanitizedSearch = sanitizeSearchQuery(search);
        query = query.or(`title.ilike.%${sanitizedSearch}%,slug.ilike.%${sanitizedSearch}%`);
      }

      if (category) {
        query = query.eq('category', category);
      }

      if (isActive !== undefined) {
        query = query.eq('is_active', isActive);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching products:', error);
        throw error;
      }

      // Transform the response to include proper counts
      const products: ProductWithCounts[] = (data || []).map((product) => ({
        ...product,
        variant_count: (product.variants as { count: number }[])?.[0]?.count ?? 0,
        media_count: (product.media as { count: number }[])?.[0]?.count ?? 0,
      }));

      return { products, total: count || 0, page, limit };
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useAdminProduct(productId: string | undefined) {
  return useQuery({
    queryKey: ['admin-product', productId],
    queryFn: async (): Promise<ProductWithDetails | null> => {
      if (!productId) return null;

      const [productRes, variantsRes, mediaRes] = await Promise.all([
        supabase.from('products').select('*').eq('id', productId).single(),
        supabase.from('product_variants').select('*').eq('product_id', productId).order('created_at'),
        supabase.from('product_media').select('*').eq('product_id', productId).order('sort_order'),
      ]);

      if (productRes.error) throw productRes.error;

      return {
        ...productRes.data,
        variants: variantsRes.data || [],
        media: mediaRes.data || [],
      };
    },
    enabled: !!productId,
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: ProductInsert) => {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Product created successfully');
    },
    onError: (error) => {
      console.error('Error creating product:', error);
      toast.error('Failed to create product');
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...product }: ProductUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update({ ...product, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-product', variables.id] });
      toast.success('Product updated successfully');
    },
    onError: (error) => {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      // First delete related records
      await Promise.all([
        supabase.from('product_variants').delete().eq('product_id', productId),
        supabase.from('product_media').delete().eq('product_id', productId),
      ]);

      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Product deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    },
  });
}

// Variant mutations
export function useCreateVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variant: ProductVariantInsert) => {
      const { data, error } = await supabase
        .from('product_variants')
        .insert(variant)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-product', variables.product_id] });
      toast.success('Variant created successfully');
    },
    onError: (error) => {
      console.error('Error creating variant:', error);
      toast.error('Failed to create variant');
    },
  });
}

export function useUpdateVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, product_id, ...variant }: TablesUpdate<'product_variants'> & { id: string; product_id: string }) => {
      const { data, error } = await supabase
        .from('product_variants')
        .update(variant)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-product', variables.product_id] });
      toast.success('Variant updated successfully');
    },
    onError: (error) => {
      console.error('Error updating variant:', error);
      toast.error('Failed to update variant');
    },
  });
}

export function useDeleteVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, product_id }: { id: string; product_id: string }) => {
      const { error } = await supabase.from('product_variants').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-product', variables.product_id] });
      toast.success('Variant deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting variant:', error);
      toast.error('Failed to delete variant');
    },
  });
}

// Media mutations
export function useUploadProductMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      file,
      altText,
    }: {
      productId: string;
      file: File;
      altText?: string;
    }) => {
      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `product-media/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('product-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get current max sort order
      const { data: existingMedia } = await supabase
        .from('product_media')
        .select('sort_order')
        .eq('product_id', productId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const sortOrder = existingMedia && existingMedia.length > 0 ? existingMedia[0].sort_order + 1 : 0;

      // Create media record
      const { data, error } = await supabase
        .from('product_media')
        .insert({
          product_id: productId,
          file_path: filePath,
          alt_text: altText,
          sort_order: sortOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-product', variables.productId] });
      toast.success('Image uploaded successfully');
    },
    onError: (error) => {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    },
  });
}

export function useDeleteProductMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath: string; productId: string }) => {
      // Delete from storage
      await supabase.storage.from('product-media').remove([filePath]);

      // Delete record
      const { error } = await supabase.from('product_media').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-product', variables.productId] });
      toast.success('Image deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    },
  });
}

export function useReorderProductMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      mediaOrder,
    }: {
      productId: string;
      mediaOrder: { id: string; sort_order: number }[];
    }) => {
      // Update sort orders in batch
      const updates = mediaOrder.map((item) =>
        supabase
          .from('product_media')
          .update({ sort_order: item.sort_order })
          .eq('id', item.id)
      );

      await Promise.all(updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-product', variables.productId] });
    },
  });
}

// Categories query
export function useProductCategories() {
  return useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null);

      if (error) throw error;

      // Extract unique categories
      const categories = [...new Set(data.map((p) => p.category).filter(Boolean))];
      return categories as string[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}