'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger-client';
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

import { ProductBasicInfo } from './ProductBasicInfo';
import { VariantManager } from './VariantManager';
import { MediaUploader } from './MediaUploader';
import {
  validateTitle,
  validateSlug,
  validateBasePrice,
  validateCategory,
  type ProductFormData,
  type FormErrors,
  type DisplayOptions,
  defaultDisplayOptions,
} from './types';

export default function AdminProductForm({ productId: routeProductId }: { productId?: string }) {
  const router = useRouter();
  const params = useParams();
  const productId = routeProductId || (params.id as string | undefined);
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
  const [formData, setFormData] = useState<ProductFormData>({
    title: '',
    slug: '',
    description: '',
    basePrice: '',
    category: '',
    seasonTag: '',
    productType: 'standard',
    allowCustomization: false,
    isActive: true,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Variants state
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  // Display options state
  const [displayOpts, setDisplayOpts] = useState<DisplayOptions>(defaultDisplayOptions);

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
        seasonTag: productData.season_tag || '',
        productType: (['standard', 'customized'].includes(productData.product_type ?? '')
          ? productData.product_type
          : 'standard') as 'standard' | 'customized',
        allowCustomization: productData.allow_customization || false,
        isActive: productData.is_active ?? true,
      });
      setVariants(productData.variants || []);
      setMedia(productData.media || []);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pd = (productData as unknown) as Record<string, unknown>;
      setDisplayOpts((prev) => ({
        ...prev,
        hasSizeSelector: Boolean(pd.has_size_selector ?? false),
        sizeOptions: (pd.size_options as string[]) ?? [],
        hasColorSelector: Boolean(pd.has_color_selector ?? false),
        colorOptions: (pd.color_options as Array<{ name: string; hex: string }>) ?? [],
        trustBadgesMode: pd.trust_badges_config ? 'custom' : 'default',
        customBadges: (pd.trust_badges_config as typeof prev.customBadges) ?? prev.customBadges,
        showRelatedProducts: (pd.show_related_products as boolean) ?? true,
        whatsappCtaUrl: (pd.whatsapp_cta_url as string) ?? '',
        adminNote: (pd.admin_note as string) ?? '',
      }));
    }
  }, [productData]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const handleChange = (field: keyof ProductFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleErrorClear = (field: keyof FormErrors) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
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
  const uploadPendingImages = async (pid: string) => {
    for (let i = 0; i < pendingFiles.length; i++) {
      try {
        await uploadMediaMutation.mutateAsync({
          productId: pid,
          file: pendingFiles[i],
          altText: formData.title,
          productSlug: formData.slug,
          category: formData.category,
          isPrimary: i === 0,
        });
      } catch (error) {
        logger.error(`Error uploading image ${i + 1}:`, error);
      }
    }
    setPendingFiles([]);
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
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
      const productDataToSave = {
        title: formData.title.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || null,
        base_price: parseFloat(formData.basePrice),
        category: formData.category.trim(),
        season_tag: formData.seasonTag.trim() || null,
        product_type: formData.productType,
        allow_customization: formData.allowCustomization,
        is_active: formData.isActive,
        currency: 'INR',
        has_size_selector: displayOpts.hasSizeSelector,
        size_options: displayOpts.sizeOptions,
        has_color_selector: displayOpts.hasColorSelector,
        color_options: displayOpts.colorOptions,
        trust_badges_config: displayOpts.trustBadgesMode === 'custom' ? displayOpts.customBadges : null,
        show_related_products: displayOpts.showRelatedProducts,
        whatsapp_cta_url: displayOpts.whatsappCtaUrl.trim() || null,
        admin_note: displayOpts.adminNote.trim() || null,
      } as ProductInsert;

      let savedProduct: Product;

      if (isEditing && productId) {
        savedProduct = await updateProductMutation.mutateAsync({
          id: productId,
          ...productDataToSave,
        });
      } else {
        savedProduct = await createProductMutation.mutateAsync(productDataToSave);
        setSavedProductId(savedProduct.id);

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

  const isLoading = isLoadingProduct && isEditing;
  const isPending = isSubmitting || createProductMutation.isPending || updateProductMutation.isPending;

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
        <ProductBasicInfo
          value={formData}
          errors={errors}
          categories={categories}
          onChange={handleChange}
          onErrorClear={handleErrorClear}
        />

        <MediaUploader
          media={media}
          pendingFiles={pendingFiles}
          previewUrls={previewUrls}
          productId={productId}
          savedProductId={savedProductId}
          productTitle={formData.title}
          productSlug={formData.slug}
          category={formData.category}
          onMediaChange={setMedia}
          onPendingFilesChange={setPendingFiles}
          onPreviewUrlsChange={setPreviewUrls}
          onUpload={uploadMediaMutation.mutateAsync}
          onDelete={deleteMediaMutation.mutateAsync}
          onSetPrimary={setPrimaryMutation.mutateAsync}
          onReorder={reorderMutation.mutateAsync}
          isUploading={uploadMediaMutation.isPending}
          isDeleting={deleteMediaMutation.isPending}
          isSettingPrimary={setPrimaryMutation.isPending}
          isReordering={reorderMutation.isPending}
        />

        <VariantManager
          variants={variants}
          productId={productId}
          savedProductId={savedProductId}
          onVariantsChange={setVariants}
          onCreateVariant={createVariantMutation.mutateAsync}
          onUpdateVariant={updateVariantMutation.mutateAsync}
          onDeleteVariant={deleteVariantMutation.mutateAsync}
          isCreating={createVariantMutation.isPending}
          isUpdating={updateVariantMutation.isPending}
          isDeleting={deleteVariantMutation.isPending}
        />

        {/* Display Options */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Display Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Size Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Size Selector</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Leave off for most crochet items — only enable if this product has distinct sizes</p>
                </div>
                <Switch
                  checked={displayOpts.hasSizeSelector}
                  onCheckedChange={(v) => setDisplayOpts((p) => ({ ...p, hasSizeSelector: v }))}
                />
              </div>
              {displayOpts.hasSizeSelector && (
                <div className="space-y-2 pl-1">
                  <div className="flex flex-wrap gap-1.5">
                    {displayOpts.sizeOptions.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 bg-stone-100 px-2.5 py-1 rounded text-sm">
                        {s}
                        <button
                          type="button"
                          onClick={() => setDisplayOpts((p) => ({ ...p, sizeOptions: p.sizeOptions.filter((x) => x !== s) }))}
                          className="text-muted-foreground hover:text-destructive ml-1"
                        >✕</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add size (e.g. S, M, L or Petite) — press Enter"
                      value={displayOpts.sizeInput}
                      onChange={(e) => setDisplayOpts((p) => ({ ...p, sizeInput: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const v = displayOpts.sizeInput.trim();
                          if (v && !displayOpts.sizeOptions.includes(v))
                            setDisplayOpts((p) => ({ ...p, sizeOptions: [...p.sizeOptions, v], sizeInput: '' }));
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const v = displayOpts.sizeInput.trim();
                        if (v && !displayOpts.sizeOptions.includes(v))
                          setDisplayOpts((p) => ({ ...p, sizeOptions: [...p.sizeOptions, v], sizeInput: '' }));
                      }}
                    >Add</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Color Selector */}
            <div className="space-y-3 border-t pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Colour Selector</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Show colour swatches on the product page</p>
                </div>
                <Switch
                  checked={displayOpts.hasColorSelector}
                  onCheckedChange={(v) => setDisplayOpts((p) => ({ ...p, hasColorSelector: v }))}
                />
              </div>
              {displayOpts.hasColorSelector && (
                <div className="space-y-2 pl-1">
                  <div className="flex flex-wrap gap-2">
                    {displayOpts.colorOptions.map((c) => (
                      <div key={c.name} className="flex items-center gap-1.5 bg-stone-100 px-2 py-1 rounded text-sm">
                        <span className="w-4 h-4 rounded-full border border-stone-300 flex-shrink-0" style={{ background: c.hex }} />
                        <span>{c.name}</span>
                        <button
                          type="button"
                          onClick={() => setDisplayOpts((p) => ({ ...p, colorOptions: p.colorOptions.filter((x) => x.name !== c.name) }))}
                          className="text-muted-foreground hover:text-destructive ml-1"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={displayOpts.colorHex}
                      onChange={(e) => setDisplayOpts((p) => ({ ...p, colorHex: e.target.value }))}
                      className="w-9 h-9 rounded border border-stone-300 cursor-pointer"
                      title="Pick colour"
                    />
                    <Input
                      placeholder="Colour name (e.g. Dusty Rose)"
                      value={displayOpts.colorInput}
                      onChange={(e) => setDisplayOpts((p) => ({ ...p, colorInput: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const name = displayOpts.colorInput.trim();
                        if (!name || displayOpts.colorOptions.find((c) => c.name === name)) return;
                        setDisplayOpts((p) => ({
                          ...p,
                          colorOptions: [...p.colorOptions, { name, hex: p.colorHex }],
                          colorInput: '',
                        }));
                      }}
                    >Add</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Trust Badges */}
            <div className="space-y-3 border-t pt-5">
              <Label className="font-medium">Trust Badges</Label>
              <div className="flex gap-6">
                {(['default', 'custom'] as const).map((mode) => (
                  <label key={mode} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="trustBadgesMode"
                      value={mode}
                      checked={displayOpts.trustBadgesMode === mode}
                      onChange={() => setDisplayOpts((p) => ({ ...p, trustBadgesMode: mode }))}
                      className="accent-[#8B1F2A]"
                    />
                    <span className="text-sm">{mode === 'default' ? 'Use site defaults' : 'Custom for this product'}</span>
                  </label>
                ))}
              </div>
              {displayOpts.trustBadgesMode === 'custom' && (
                <div className="space-y-2 pl-1">
                  {displayOpts.customBadges.map((b, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input
                        placeholder="Icon (emoji)"
                        value={b.icon}
                        onChange={(e) => setDisplayOpts((p) => {
                          const next = [...p.customBadges];
                          next[i] = { ...next[i], icon: e.target.value };
                          return { ...p, customBadges: next };
                        })}
                        className="w-20"
                      />
                      <Input
                        placeholder="Label text"
                        value={b.label}
                        onChange={(e) => setDisplayOpts((p) => {
                          const next = [...p.customBadges];
                          next[i] = { ...next[i], label: e.target.value };
                          return { ...p, customBadges: next };
                        })}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Related Products */}
            <div className="flex items-center justify-between border-t pt-5">
              <div>
                <Label className="font-medium">Show Related Products</Label>
                <p className="text-xs text-muted-foreground mt-0.5">&quot;You May Also Love&quot; section at page bottom</p>
              </div>
              <Switch
                checked={displayOpts.showRelatedProducts}
                onCheckedChange={(v) => setDisplayOpts((p) => ({ ...p, showRelatedProducts: v }))}
              />
            </div>

            {/* WhatsApp CTA URL */}
            <div className="space-y-2 border-t pt-5">
              <Label className="font-medium">Custom WhatsApp CTA URL</Label>
              <p className="text-xs text-muted-foreground">Override the default WhatsApp link for this product only. Leave blank to use the global number.</p>
              <Input
                placeholder="https://wa.me/919876543210?text=Hi+about+this+item"
                value={displayOpts.whatsappCtaUrl}
                onChange={(e) => setDisplayOpts((p) => ({ ...p, whatsappCtaUrl: e.target.value }))}
              />
            </div>

            {/* Admin Note */}
            <div className="space-y-2 border-t pt-5">
              <Label className="font-medium">Admin Note <span className="font-normal text-muted-foreground text-xs">(internal — not shown to customers)</span></Label>
              <Textarea
                placeholder="Any notes about this product for the team..."
                value={displayOpts.adminNote}
                onChange={(e) => setDisplayOpts((p) => ({ ...p, adminNote: e.target.value }))}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="productType">Product Type</Label>
              <Select
                value={formData.productType}
                onValueChange={(value: 'standard' | 'customized') => handleChange('productType', value)}
              >
                <SelectTrigger id="productType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard — pre-made, ships immediately</SelectItem>
                  <SelectItem value="customized">Customized — made to order</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
    </div>
  );
}
