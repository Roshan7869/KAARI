'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Loader2, Plus, Trash2, Edit, ImagePlus, Star, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { getCloudinaryImageUrl } from '@/lib/cloudinary';
import {
  useAdminProduct,
  useCreateProduct,
  useUpdateProduct,
  useCreateVariant,
  useUpdateVariant,
  useDeleteVariant,
  useUploadProductMedia,
  useDeleteProductMedia,
  useSetPrimaryMedia,
  useReorderProductMedia,
  useProductCategories,
  type Product,
  type ProductInsert,
  type ProductVariant,
  type ProductMedia,
} from '@/hooks/useAdminProducts';

// Form validation types
interface FormErrors {
  title?: string;
  slug?: string;
  basePrice?: string;
  category?: string;
}

interface VariantFormData {
  color: string;
  material: string;
  size: string;
  price_adjustment: string;
  stock_qty: string;
  sku: string;
  is_default: boolean;
}

const emptyVariantForm: VariantFormData = {
  color: '',
  material: '',
  size: '',
  price_adjustment: '0',
  stock_qty: '0',
  sku: '',
  is_default: false,
};

// Slug generation utility
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/-+/g, '-') // Replace multiple dashes with single
    .replace(/^-+|-+$/g, ''); // Trim dashes from start/end
}

// Validation utilities
function validateTitle(title: string): string | undefined {
  if (!title.trim()) return 'Product name is required';
  if (title.length < 2) return 'Product name must be at least 2 characters';
  if (title.length > 200) return 'Product name must be less than 200 characters';
}

function validateSlug(slug: string): string | undefined {
  if (!slug.trim()) return 'Slug is required';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return 'Slug must be lowercase alphanumeric with dashes';
  }
  if (slug.length > 100) return 'Slug must be less than 100 characters';
}

function validateBasePrice(price: string): string | undefined {
  const num = parseFloat(price);
  if (isNaN(num)) return 'Price must be a valid number';
  if (num <= 0) return 'Price must be greater than 0';
  if (num > 9999999) return 'Price is too large';
}

function validateCategory(category: string): string | undefined {
  if (!category.trim()) return 'Category is required';
}

export default function AdminProductForm() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string | undefined;
  const isEditing = Boolean(productId && productId !== 'new');

  // Queries and mutations
  const { data: productData, isLoading: isLoadingProduct } = useAdminProduct(isEditing ? productId : undefined);
  const { data: categories } = useProductCategories();
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const createVariantMutation = useCreateVariant();
  const updateVariantMutation = useUpdateVariant();
  const deleteVariantMutation = useDeleteVariant();
  const uploadMediaMutation = useUploadProductMedia();
  const deleteMediaMutation = useDeleteProductMedia();
  const setPrimaryMutation = useSetPrimaryMedia();
  const reorderMutation = useReorderProductMedia();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    basePrice: '',
    category: '',
    productType: 'physical',
    allowCustomization: false,
    isActive: true,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  // Variants state
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [variantForm, setVariantForm] = useState<VariantFormData>(emptyVariantForm);

  // Media state
  const [media, setMedia] = useState<ProductMedia[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // Track saved product ID for new products
  const [savedProductId, setSavedProductId] = useState<string | null>(null);

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when editing existing product
  useEffect(() => {
    if (productData) {
      setFormData({
        title: productData.title || '',
        slug: productData.slug || '',
        description: productData.description || '',
        basePrice: productData.base_price?.toString() || '',
        category: productData.category || '',
        productType: productData.product_type || 'physical',
        allowCustomization: productData.allow_customization || false,
        isActive: productData.is_active ?? true,
      });
      setVariants(productData.variants || []);
      setMedia(productData.media || []);
      setIsSlugManuallyEdited(true);
    }
  }, [productData]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  // Auto-generate slug from title
  const handleTitleChange = (title: string) => {
    handleChange('title', title);
    if (!isSlugManuallyEdited) {
      handleChange('slug', generateSlug(title));
    }
    if (errors.title) {
      setErrors(prev => ({ ...prev, title: undefined }));
    }
  };

  const handleSlugChange = (slug: string) => {
    handleChange('slug', slug);
    setIsSlugManuallyEdited(true);
    if (errors.slug) {
      setErrors(prev => ({ ...prev, slug: undefined }));
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    const titleError = validateTitle(formData.title);
    if (titleError) newErrors.title = titleError;

    const slugError = validateSlug(formData.slug);
    if (slugError) newErrors.slug = slugError;

    const priceError = validateBasePrice(formData.basePrice);
    if (priceError) newErrors.basePrice = priceError;

    const categoryError = validateCategory(formData.category);
    if (categoryError) newErrors.category = categoryError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Upload pending images after product creation
  const uploadPendingImages = async (productId: string) => {
    for (let i = 0; i < pendingFiles.length; i++) {
      try {
        await uploadMediaMutation.mutateAsync({
          productId,
          file: pendingFiles[i],
          altText: formData.title,
          productSlug: formData.slug,
          category: formData.category,
          isPrimary: i === 0, // first image is primary
        });
      } catch (error) {
        logger.error(`Error uploading image ${i + 1}:`, error);
      }
    }
    setPendingFiles([]);
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPreviewUrls([]);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }

    setIsSubmitting(true);

    try {
      const productDataToSave: ProductInsert = {
        title: formData.title.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || null,
        base_price: parseFloat(formData.basePrice),
        category: formData.category.trim(),
        product_type: formData.productType,
        allow_customization: formData.allowCustomization,
        is_active: formData.isActive,
        currency: 'INR',
      };

      let savedProduct: Product;

      if (isEditing && productId) {
        // Update existing product
        savedProduct = await updateProductMutation.mutateAsync({
          id: productId,
          ...productDataToSave,
        });
      } else {
        // Create new product
        savedProduct = await createProductMutation.mutateAsync(productDataToSave);
        setSavedProductId(savedProduct.id);

        // Upload pending images for new product
        if (pendingFiles.length > 0) {
          await uploadPendingImages(savedProduct.id);
        }
      }

      router.push('/admin/products');
    } catch (error) {
      logger.error('Error saving product:', error);
      toast.error('Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Image upload handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate files
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    const validFiles = files.filter(f => {
      if (!validTypes.includes(f.type)) {
        toast.error(`${f.name}: Invalid file type. Use JPEG, PNG, WebP, or GIF.`);
        return false;
      }
      if (f.size > maxSize) {
        toast.error(`${f.name}: File too large. Max size is 5MB.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const currentProductId = isEditing ? productId : savedProductId;

    if (currentProductId) {
      // Upload images for existing product
      validFiles.forEach(async (file) => {
        try {
          await uploadMediaMutation.mutateAsync({
            productId: currentProductId,
            file,
            altText: formData.title,
            productSlug: formData.slug,
            category: formData.category,
          });
          // Refresh media list would be handled by the mutation invalidating the query
        } catch (error) {
          logger.error('Error uploading image:', error);
        }
      });
    } else {
      // Store files temporarily for upload after product creation
      setPendingFiles(prev => [...prev, ...validFiles]);
      const urls = validFiles.map(f => URL.createObjectURL(f));
      setPreviewUrls(prev => [...prev, ...urls]);
      toast.info('Images will be uploaded after product creation');
    }

    // Reset input
    e.target.value = '';
  };

  const handleDeleteMedia = async (mediaItem: ProductMedia) => {
    const currentProductId = isEditing ? productId : savedProductId;
    if (!currentProductId) {
      toast.error('Cannot delete images before product creation');
      return;
    }

    try {
      await deleteMediaMutation.mutateAsync({
        id: mediaItem.id,
        filePath: mediaItem.file_path,
        productId: currentProductId,
      });
    } catch (error) {
      logger.error('Error deleting image:', error);
    }
  };

  const handleRemovePreview = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Variant handlers
  const handleOpenVariantDialog = (variant?: ProductVariant) => {
    if (variant) {
      setEditingVariant(variant);
      setVariantForm({
        color: variant.color || '',
        material: variant.material || '',
        size: variant.size || '',
        price_adjustment: (variant.price || 0).toString(),
        stock_qty: variant.stock_qty.toString(),
        sku: variant.sku || '',
        is_default: variant.is_default,
      });
    } else {
      setEditingVariant(null);
      setVariantForm(emptyVariantForm);
    }
    setIsVariantDialogOpen(true);
  };

  const handleSaveVariant = async () => {
    const currentProductId = isEditing ? productId : savedProductId;
    if (!currentProductId) {
      toast.error('Please save the product before adding variants');
      setIsVariantDialogOpen(false);
      return;
    }

    const stockQty = parseInt(variantForm.stock_qty, 10);
    if (isNaN(stockQty) || stockQty < 0) {
      toast.error('Stock quantity must be 0 or greater');
      return;
    }

    const priceAdjustment = parseFloat(variantForm.price_adjustment);
    if (isNaN(priceAdjustment)) {
      toast.error('Price adjustment must be a valid number');
      return;
    }

    try {
      const variantData = {
        product_id: currentProductId,
        color: variantForm.color || null,
        material: variantForm.material || null,
        size: variantForm.size || null,
        price: priceAdjustment || null,
        stock_qty: stockQty,
        sku: variantForm.sku || null,
        is_default: variantForm.is_default,
      };

      if (editingVariant) {
        await updateVariantMutation.mutateAsync({
          id: editingVariant.id,
          ...variantData,
        });
      } else {
        await createVariantMutation.mutateAsync(variantData);
      }

      setIsVariantDialogOpen(false);
      setVariantForm(emptyVariantForm);
      setEditingVariant(null);
    } catch (error) {
      logger.error('Error saving variant:', error);
    }
  };

  const handleDeleteVariant = async (variant: ProductVariant) => {
    const currentProductId = isEditing ? productId : savedProductId;
    if (!currentProductId) {
      toast.error('Cannot delete variants before product creation');
      return;
    }

    if (!confirm('Are you sure you want to delete this variant?')) return;

    try {
      await deleteVariantMutation.mutateAsync({
        id: variant.id,
        product_id: currentProductId,
      });
    } catch (error) {
      logger.error('Error deleting variant:', error);
    }
  };

  const isLoading = isLoadingProduct && isEditing;
  const isPending = isSubmitting || createProductMutation.isPending || updateProductMutation.isPending;

  // Resolve image URL — supports Cloudinary public IDs and Supabase storage paths
  const resolveImageUrl = (filePath: string) => {
    if (!filePath) return '';
    if (filePath.startsWith('http')) return filePath;
    // Cloudinary public IDs don't have a leading slash and usually contain a folder prefix
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (cloudName && !filePath.includes('/storage/v1/')) {
      return getCloudinaryImageUrl(filePath, { width: 400, height: 400, quality: 'auto' });
    }
    // Supabase storage path fallback
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/v1', '') || process.env.NEXT_PUBLIC_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/${filePath}`;
  };

  // Move image up/down in sort order
  const handleMoveMedia = async (index: number, direction: 'up' | 'down') => {
    const currentProductId = isEditing ? productId : savedProductId;
    if (!currentProductId) return;
    const newMedia = [...media];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newMedia.length) return;
    [newMedia[index], newMedia[targetIndex]] = [newMedia[targetIndex], newMedia[index]];
    const mediaOrder = newMedia.map((m, i) => ({ id: m.id, sort_order: i }));
    try {
      await reorderMutation.mutateAsync({ productId: currentProductId, mediaOrder });
      setMedia(newMedia.map((m, i) => ({ ...m, sort_order: i })));
    } catch (error) {
      logger.error('Error reordering images:', error);
    }
  };

  const handleSetPrimary = async (mediaItem: ProductMedia) => {
    const currentProductId = isEditing ? productId : savedProductId;
    if (!currentProductId) return;
    try {
      await setPrimaryMutation.mutateAsync({ mediaId: mediaItem.id, productId: currentProductId });
    } catch (error) {
      logger.error('Error setting primary image:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push('/admin/products')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="font-display text-2xl">
          {isEditing ? 'Edit Product' : 'Create New Product'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Product Name *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Handmade Crochet Bag"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className={errors.title ? 'border-destructive' : ''}
                />
                {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  placeholder="e.g., handmade-crochet-bag"
                  value={formData.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className={errors.slug ? 'border-destructive' : ''}
                />
                {errors.slug && <p className="text-sm text-destructive">{errors.slug}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your product..."
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Category */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Pricing & Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="basePrice">Base Price (INR) *</Label>
                <Input
                  id="basePrice"
                  type="number"
                  placeholder="2999"
                  value={formData.basePrice}
                  onChange={(e) => {
                    handleChange('basePrice', e.target.value);
                    if (errors.basePrice) setErrors(prev => ({ ...prev, basePrice: undefined }));
                  }}
                  className={errors.basePrice ? 'border-destructive' : ''}
                  min="0"
                  step="1"
                />
                {errors.basePrice && <p className="text-sm text-destructive">{errors.basePrice}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.category}
                    onValueChange={(value) => {
                      handleChange('category', value);
                      if (errors.category) setErrors(prev => ({ ...prev, category: undefined }));
                    }}
                  >
                    <SelectTrigger className={errors.category ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Or new category"
                    value={!categories?.includes(formData.category) ? formData.category : ''}
                    onChange={(e) => {
                      handleChange('category', e.target.value);
                      if (errors.category) setErrors(prev => ({ ...prev, category: undefined }));
                    }}
                    className="flex-1"
                  />
                </div>
                {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Images */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Product Images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Existing media */}
              {media.map((item, index) => (
                <div key={item.id} className="relative group aspect-square rounded-lg overflow-hidden border">
                  <Image
                    src={resolveImageUrl(item.file_path)}
                    alt={item.alt_text || `Product image ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  {/* Primary badge */}
                  {item.is_primary && (
                    <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-current" /> Primary
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                    {/* Set Primary */}
                    {!item.is_primary && (
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => handleSetPrimary(item)}
                        disabled={setPrimaryMutation.isPending}
                        className="text-xs h-7 px-2 bg-white/90 hover:bg-white text-black"
                      >
                        <Star className="w-3 h-3 mr-1" /> Set Primary
                      </Button>
                    )}
                    {/* Reorder */}
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        type="button"
                        onClick={() => handleMoveMedia(index, 'up')}
                        disabled={index === 0 || reorderMutation.isPending}
                        className="h-7 w-7 bg-white/90 hover:bg-white text-black"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        type="button"
                        onClick={() => handleMoveMedia(index, 'down')}
                        disabled={index === media.length - 1 || reorderMutation.isPending}
                        className="h-7 w-7 bg-white/90 hover:bg-white text-black"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        type="button"
                        onClick={() => handleDeleteMedia(item)}
                        disabled={deleteMediaMutation.isPending}
                        className="h-7 w-7"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                    {index + 1}
                  </div>
                </div>
              ))}

              {/* Preview URLs for pending uploads */}
              {previewUrls.map((url, index) => (
                <div key={url} className="relative group aspect-square rounded-lg overflow-hidden border">
                  <Image
                    src={url}
                    alt={`Preview ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      variant="destructive"
                      size="icon"
                      type="button"
                      onClick={() => handleRemovePreview(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Upload button */}
              <label className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                {uploadMediaMutation.isPending ? (
                  <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                ) : (
                  <ImagePlus className="h-8 w-8 text-muted-foreground mb-2" />
                )}
                <span className="text-sm text-muted-foreground">Add Image</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={uploadMediaMutation.isPending}
                />
              </label>
            </div>
            <p className="text-sm text-muted-foreground">
              Supported formats: JPEG, PNG, WebP, GIF. Max size: 5MB per image.
            </p>
          </CardContent>
        </Card>

        {/* Product Variants */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display">Product Variants</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenVariantDialog()}
              disabled={!isEditing && !savedProductId}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Variant
            </Button>
          </CardHeader>
          <CardContent>
            {!isEditing && !savedProductId && (
              <p className="text-sm text-muted-foreground mb-4">
                Save the product first to add variants.
              </p>
            )}

            {variants.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Default</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Price Adj.</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.map((variant) => (
                    <TableRow key={variant.id}>
                      <TableCell>
                        {variant.is_default && (
                          <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded">
                            Default
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{variant.color || '-'}</TableCell>
                      <TableCell>{variant.material || '-'}</TableCell>
                      <TableCell>{variant.size || '-'}</TableCell>
                      <TableCell>
                        {variant.price != null ? `${variant.price > 0 ? '+' : ''}${variant.price}` : '0'}
                      </TableCell>
                      <TableCell>{variant.stock_qty}</TableCell>
                      <TableCell>{variant.sku || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => handleOpenVariantDialog(variant)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => handleDeleteVariant(variant)}
                          disabled={deleteVariantMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                No variants added yet. Products without variants will use base price and stock.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">Product will be visible to customers</p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => handleChange('isActive', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Customization</Label>
                <p className="text-sm text-muted-foreground">Customers can request custom designs</p>
              </div>
              <Switch
                checked={formData.allowCustomization}
                onCheckedChange={(checked) => handleChange('allowCustomization', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/products')}
            disabled={isPending}
          >
            Cancel
          </Button>

          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              isEditing ? 'Update Product' : 'Create Product'
            )}
          </Button>
        </div>
      </form>

      {/* Variant Dialog */}
      <Dialog open={isVariantDialogOpen} onOpenChange={setIsVariantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVariant ? 'Edit Variant' : 'Add Variant'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="variant-color">Color</Label>
                <Input
                  id="variant-color"
                  placeholder="e.g., Navy Blue"
                  value={variantForm.color}
                  onChange={(e) => setVariantForm(prev => ({ ...prev, color: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="variant-material">Material</Label>
                <Input
                  id="variant-material"
                  placeholder="e.g., Cotton"
                  value={variantForm.material}
                  onChange={(e) => setVariantForm(prev => ({ ...prev, material: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="variant-size">Size</Label>
                <Input
                  id="variant-size"
                  placeholder="e.g., Medium"
                  value={variantForm.size}
                  onChange={(e) => setVariantForm(prev => ({ ...prev, size: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="variant-sku">SKU</Label>
                <Input
                  id="variant-sku"
                  placeholder="e.g., BAG-001-M"
                  value={variantForm.sku}
                  onChange={(e) => setVariantForm(prev => ({ ...prev, sku: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="variant-price">Price Adjustment (INR)</Label>
                <Input
                  id="variant-price"
                  type="number"
                  placeholder="0"
                  value={variantForm.price_adjustment}
                  onChange={(e) => setVariantForm(prev => ({ ...prev, price_adjustment: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="variant-stock">Stock Quantity *</Label>
                <Input
                  id="variant-stock"
                  type="number"
                  placeholder="0"
                  value={variantForm.stock_qty}
                  onChange={(e) => setVariantForm(prev => ({ ...prev, stock_qty: e.target.value }))}
                  min="0"
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="variant-default"
                checked={variantForm.is_default}
                onCheckedChange={(checked) => setVariantForm(prev => ({ ...prev, is_default: checked }))}
              />
              <Label htmlFor="variant-default">Set as default variant</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setIsVariantDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveVariant}
              disabled={createVariantMutation.isPending || updateVariantMutation.isPending}
            >
              {(createVariantMutation.isPending || updateVariantMutation.isPending) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Variant'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}