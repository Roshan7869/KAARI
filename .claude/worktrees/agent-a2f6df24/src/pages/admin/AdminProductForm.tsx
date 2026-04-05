import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2, Package, Image as ImageIcon, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeTextInput } from '@/lib/sanitization';
import { ImageUploader } from '@/components/admin/ImageUploader';
import {
  useAdminProduct,
  useCreateProduct,
  useUpdateProduct,
  useCreateVariant,
  useUpdateVariant,
  useDeleteVariant,
  useUploadProductMedia,
  useDeleteProductMedia,
} from '@/hooks/useAdminProducts';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProductFormData {
  title: string;
  slug: string;
  description: string;
  base_price: number;
  category: string;
  product_type: string;
  allow_customization: boolean;
  is_active: boolean;
}

interface VariantFormData {
  sku: string;
  size: string;
  color: string;
  material: string;
  price: number;
  stock_qty: number;
  production_days: number;
  is_default: boolean;
}

const defaultProductForm: ProductFormData = {
  title: '',
  slug: '',
  description: '',
  base_price: 0,
  category: '',
  product_type: 'finished',
  allow_customization: false,
  is_active: true,
};

const defaultVariantForm: VariantFormData = {
  sku: '',
  size: '',
  color: '',
  material: '',
  price: 0,
  stock_qty: 0,
  production_days: 7,
  is_default: true,
};

const productTypes = [
  { value: 'finished', label: 'Finished Product' },
  { value: 'customizable', label: 'Customizable Product' },
  { value: 'made_to_order', label: 'Made to Order' },
];

const categories = [
  'Bags',
  'Accessories',
  'Home Decor',
  'Clothing',
  'Toys',
  'Seasonal',
  'Other',
];

export default function AdminProductForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: product, isLoading } = useAdminProduct(id);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const createVariant = useCreateVariant();
  const updateVariant = useUpdateVariant();
  const deleteVariant = useDeleteVariant();
  const uploadMedia = useUploadProductMedia();
  const deleteMedia = useDeleteProductMedia();

  const [productForm, setProductForm] = useState<ProductFormData>(defaultProductForm);
  const [variants, setVariants] = useState<Tables<'product_variants'>[]>([]);
  const [media, setMedia] = useState<Tables<'product_media'>[]>([]);
  const [saving, setSaving] = useState(false);
  const [variantDialog, setVariantDialog] = useState<{
    open: boolean;
    editingId: string | null;
    data: VariantFormData;
  }>({ open: false, editingId: null, data: defaultVariantForm });
  const [deleteVariantId, setDeleteVariantId] = useState<string | null>(null);
  const [deleteMediaId, setDeleteMediaId] = useState<{ id: string; path: string } | null>(null);

  // Populate form when editing
  useEffect(() => {
    if (product) {
      setProductForm({
        title: product.title,
        slug: product.slug,
        description: product.description || '',
        base_price: product.base_price,
        category: product.category || '',
        product_type: product.product_type,
        allow_customization: product.allow_customization,
        is_active: product.is_active,
      });
      setVariants(product.variants);
      setMedia(product.media);
    }
  }, [product]);

  // Generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleProductChange = (field: keyof ProductFormData, value: string | number | boolean) => {
    setProductForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'title' && !isEditing) {
        updated.slug = generateSlug(value as string);
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Sanitize text inputs before submission
    const sanitizedForm = {
      ...productForm,
      title: sanitizeTextInput(productForm.title, 255),
      slug: sanitizeTextInput(productForm.slug, 255),
      description: sanitizeTextInput(productForm.description, 5000),
      category: productForm.category ? sanitizeTextInput(productForm.category, 100) : null,
    };

    try {
      if (isEditing && id) {
        await updateProduct.mutateAsync({
          id,
          ...sanitizedForm,
        });
      } else {
        const result = await createProduct.mutateAsync({
          ...sanitizedForm,
          description: sanitizedForm.description || null,
        });

        // Navigate to edit page for new product
        navigate(`/admin/products/${result.id}`);
        return;
      }
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleVariantSubmit = async () => {
    if (!id) return;

    // Sanitize variant inputs
    const variantData: TablesInsert<'product_variants'> = {
      product_id: id,
      sku: variantDialog.data.sku ? sanitizeTextInput(variantDialog.data.sku, 100) : null,
      size: variantDialog.data.size ? sanitizeTextInput(variantDialog.data.size, 50) : null,
      color: variantDialog.data.color ? sanitizeTextInput(variantDialog.data.color, 50) : null,
      material: variantDialog.data.material ? sanitizeTextInput(variantDialog.data.material, 100) : null,
      price: variantDialog.data.price || null,
      stock_qty: variantDialog.data.stock_qty,
      production_days: variantDialog.data.production_days || null,
      is_default: variantDialog.data.is_default,
    };

    if (variantDialog.editingId) {
      await updateVariant.mutateAsync({
        id: variantDialog.editingId,
        product_id: id,
        ...variantData,
      });
    } else {
      await createVariant.mutateAsync(variantData);
    }

    setVariantDialog({ open: false, editingId: null, data: defaultVariantForm });
  };

  const handleDeleteVariant = async () => {
    if (!deleteVariantId || !id) return;
    await deleteVariant.mutateAsync({ id: deleteVariantId, product_id: id });
    setDeleteVariantId(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!id || !e.target.files) return;

    const files = Array.from(e.target.files);
    for (const file of files) {
      await uploadMedia.mutateAsync({
        productId: id,
        file,
        altText: productForm.title,
      });
    }

    e.target.value = '';
  };

  const handleDeleteImage = async () => {
    if (!deleteMediaId || !id) return;
    await deleteMedia.mutateAsync({
      id: deleteMediaId.id,
      filePath: deleteMediaId.path,
      productId: id,
    });
    setDeleteMediaId(null);
  };

  if (isLoading && isEditing) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/products')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-display text-3xl text-foreground">
            {isEditing ? 'Edit Product' : 'New Product'}
          </h1>
          <p className="font-body text-muted-foreground mt-1">
            {isEditing ? 'Update product details' : 'Create a new product'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
            <CardDescription>Product name, description, and category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={productForm.title}
                  onChange={(e) => handleProductChange('title', e.target.value)}
                  placeholder="Product name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={productForm.slug}
                  onChange={(e) => handleProductChange('slug', e.target.value)}
                  placeholder="product-url-slug"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={productForm.description}
                onChange={(e) => handleProductChange('description', e.target.value)}
                placeholder="Product description..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={productForm.category}
                  onValueChange={(v) => handleProductChange('category', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="product_type">Product Type</Label>
                <Select
                  value={productForm.product_type}
                  onValueChange={(v) => handleProductChange('product_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {productTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="base_price">Base Price (₹) *</Label>
                <Input
                  id="base_price"
                  type="number"
                  min="0"
                  step="1"
                  value={productForm.base_price}
                  onChange={(e) => handleProductChange('base_price', parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="allow_customization"
                  checked={productForm.allow_customization}
                  onCheckedChange={(checked) => handleProductChange('allow_customization', checked)}
                />
                <Label htmlFor="allow_customization">Allow Customization</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={productForm.is_active}
                  onCheckedChange={(checked) => handleProductChange('is_active', checked)}
                />
                <Label htmlFor="is_active">Active (Visible)</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Variants Section - Only show when editing */}
        {isEditing && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">Variants</CardTitle>
                  <CardDescription>Product variants (size, color, material)</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setVariantDialog({ open: true, editingId: null, data: defaultVariantForm })
                  }
                >
                  Add Variant
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {variants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="font-body text-sm">No variants yet</p>
                  <p className="font-body text-xs">Add at least one variant to enable purchases</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="flex items-center justify-between p-3 bg-accent/5 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        {variant.is_default && (
                          <Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>
                        )}
                        <div>
                          <p className="font-body text-sm font-medium">
                            {variant.sku || 'No SKU'}
                          </p>
                          <p className="font-body text-xs text-muted-foreground">
                            {[variant.size, variant.color, variant.material]
                              .filter(Boolean)
                              .join(' / ') || 'No attributes'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-body text-sm font-medium">
                            ₹{(variant.price || productForm.base_price).toLocaleString('en-IN')}
                          </p>
                          <p className="font-body text-xs text-muted-foreground">
                            Stock: {variant.stock_qty}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setVariantDialog({
                                open: true,
                                editingId: variant.id,
                                data: {
                                  sku: variant.sku || '',
                                  size: variant.size || '',
                                  color: variant.color || '',
                                  material: variant.material || '',
                                  price: variant.price || 0,
                                  stock_qty: variant.stock_qty,
                                  production_days: variant.production_days || 7,
                                  is_default: variant.is_default,
                                },
                              })
                            }
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteVariantId(variant.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Images Section - Only show when editing */}
        {isEditing && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">Product Images</CardTitle>
                  <CardDescription>Upload product images - first image will be the primary image</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ImageUploader
                productId={id}
                productTitle={productForm.title}
                onUpload={async (files) => {
                  for (const file of files) {
                    await uploadMedia.mutateAsync({
                      productId: id,
                      file,
                      altText: productForm.title,
                    });
                  }
                }}
                isUploading={uploadMedia.isPending}
                existingImages={media.map((img) => ({
                  id: img.id,
                  file_path: supabase.storage.from('product-media').getPublicUrl(img.file_path).data.publicUrl,
                  alt_text: img.alt_text || undefined,
                }))}
                onDeleteExisting={(imageId, path) => {
                  setDeleteMediaId({ id: imageId, path });
                }}
                maxFiles={10}
                maxSizeMB={5}
              />
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/products')}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditing ? 'Update Product' : 'Create Product'}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Variant Dialog */}
      <Dialog open={variantDialog.open} onOpenChange={(open) => setVariantDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{variantDialog.editingId ? 'Edit Variant' : 'Add Variant'}</DialogTitle>
            <DialogDescription>
              Configure variant attributes, pricing, and inventory
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input
                  value={variantDialog.data.sku}
                  onChange={(e) =>
                    setVariantDialog((prev) => ({
                      ...prev,
                      data: { ...prev.data, sku: e.target.value },
                    }))
                  }
                  placeholder="PROD-SIZE-COLOR"
                />
              </div>
              <div className="space-y-2">
                <Label>Stock Quantity *</Label>
                <Input
                  type="number"
                  min="0"
                  value={variantDialog.data.stock_qty}
                  onChange={(e) =>
                    setVariantDialog((prev) => ({
                      ...prev,
                      data: { ...prev.data, stock_qty: parseInt(e.target.value) || 0 },
                    }))
                  }
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Size</Label>
                <Input
                  value={variantDialog.data.size}
                  onChange={(e) =>
                    setVariantDialog((prev) => ({
                      ...prev,
                      data: { ...prev.data, size: e.target.value },
                    }))
                  }
                  placeholder="S, M, L..."
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input
                  value={variantDialog.data.color}
                  onChange={(e) =>
                    setVariantDialog((prev) => ({
                      ...prev,
                      data: { ...prev.data, color: e.target.value },
                    }))
                  }
                  placeholder="Red, Blue..."
                />
              </div>
              <div className="space-y-2">
                <Label>Material</Label>
                <Input
                  value={variantDialog.data.material}
                  onChange={(e) =>
                    setVariantDialog((prev) => ({
                      ...prev,
                      data: { ...prev.data, material: e.target.value },
                    }))
                  }
                  placeholder="Cotton, Wool..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price Override (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={variantDialog.data.price}
                  onChange={(e) =>
                    setVariantDialog((prev) => ({
                      ...prev,
                      data: { ...prev.data, price: parseFloat(e.target.value) || 0 },
                    }))
                  }
                  placeholder="Leave 0 for base price"
                />
              </div>
              <div className="space-y-2">
                <Label>Production Days</Label>
                <Input
                  type="number"
                  min="1"
                  value={variantDialog.data.production_days}
                  onChange={(e) =>
                    setVariantDialog((prev) => ({
                      ...prev,
                      data: { ...prev.data, production_days: parseInt(e.target.value) || 7 },
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_default"
                checked={variantDialog.data.is_default}
                onChange={(e) =>
                  setVariantDialog((prev) => ({
                    ...prev,
                    data: { ...prev.data, is_default: e.target.checked },
                  }))
                }
                className="w-4 h-4"
              />
              <Label htmlFor="is_default">Default variant</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setVariantDialog((prev) => ({ ...prev, open: false }))}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleVariantSubmit}>
              {variantDialog.editingId ? 'Update' : 'Add'} Variant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Variant Dialog */}
      <AlertDialog open={!!deleteVariantId} onOpenChange={() => setDeleteVariantId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Variant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this variant? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVariant} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Image Dialog */}
      <AlertDialog open={!!deleteMediaId} onOpenChange={() => setDeleteMediaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteImage} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}