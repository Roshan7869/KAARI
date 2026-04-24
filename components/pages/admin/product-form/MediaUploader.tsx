'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ImagePlus, Trash2, Star, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger-client';
import { getCloudinaryImageUrl } from '@/lib/cloudinary';
import { type ProductMedia } from '@/hooks/useAdminProducts';

interface MediaUploaderProps {
  media: ProductMedia[];
  pendingFiles: File[];
  previewUrls: string[];
  productId?: string;
  savedProductId: string | null;
  productTitle: string;
  productSlug: string;
  category: string;
  onMediaChange: (media: ProductMedia[]) => void;
  onPendingFilesChange: (files: File[]) => void;
  onPreviewUrlsChange: (urls: string[]) => void;
  onUpload: (params: {
    productId: string;
    file: File;
    altText?: string;
    productSlug?: string;
    category?: string;
  }) => Promise<unknown>;
  onDelete: (params: { id: string; filePath: string; productId: string }) => Promise<unknown>;
  onSetPrimary: (params: { mediaId: string; productId: string }) => Promise<unknown>;
  onReorder: (params: {
    productId: string;
    mediaOrder: Array<{ id: string; sort_order: number }>;
  }) => Promise<unknown>;
  isUploading: boolean;
  isDeleting: boolean;
  isSettingPrimary: boolean;
  isReordering: boolean;
}

export function MediaUploader({
  media,
  pendingFiles,
  previewUrls,
  productId,
  savedProductId,
  productTitle,
  productSlug,
  category,
  onMediaChange,
  onPendingFilesChange,
  onPreviewUrlsChange,
  onUpload,
  onDelete,
  onSetPrimary,
  onReorder,
  isUploading,
  isDeleting,
  isSettingPrimary,
  isReordering,
}: MediaUploaderProps) {
  const currentProductId = productId || savedProductId;

  const resolveImageUrl = (filePath: string) => {
    if (!filePath) return '';
    if (filePath.startsWith('http')) return filePath;
    if (filePath.startsWith('/images/')) return filePath;
    if (filePath.startsWith('/') && !filePath.startsWith('/storage')) return filePath;
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (cloudName && !filePath.includes('/storage/v1/')) {
      return getCloudinaryImageUrl(filePath, { width: 400, height: 400, quality: 'auto' });
    }
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/v1', '') || process.env.NEXT_PUBLIC_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/${filePath}`;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 5 * 1024 * 1024;

    const validFiles = files.filter((f) => {
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

    if (currentProductId) {
      for (let i = 0; i < validFiles.length; i++) {
        if (validFiles.length > 1) {
          toast.info(`Uploading image ${i + 1} of ${validFiles.length}…`);
        }
        try {
          await onUpload({
            productId: currentProductId,
            file: validFiles[i],
            altText: productTitle,
            productSlug,
            category,
          });
        } catch (error) {
          logger.error(`Error uploading image ${i + 1}:`, error);
        }
      }
    } else {
      onPendingFilesChange([...pendingFiles, ...validFiles]);
      const urls = validFiles.map((f) => URL.createObjectURL(f));
      onPreviewUrlsChange([...previewUrls, ...urls]);
      toast.info('Images will be uploaded after product creation');
    }

    e.target.value = '';
  };

  const handleDeleteMedia = async (mediaItem: ProductMedia) => {
    if (!currentProductId) {
      toast.error('Cannot delete images before product creation');
      return;
    }
    try {
      await onDelete({
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
    onPreviewUrlsChange(previewUrls.filter((_, i) => i !== index));
    onPendingFilesChange(pendingFiles.filter((_, i) => i !== index));
  };

  const handleMoveMedia = async (index: number, direction: 'up' | 'down') => {
    if (!currentProductId) return;
    const newMedia = [...media];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newMedia.length) return;
    [newMedia[index], newMedia[targetIndex]] = [newMedia[targetIndex], newMedia[index]];
    const mediaOrder = newMedia.map((m, i) => ({ id: m.id, sort_order: i }));
    try {
      await onReorder({ productId: currentProductId, mediaOrder });
      onMediaChange(newMedia.map((m, i) => ({ ...m, sort_order: i })));
    } catch (error) {
      logger.error('Error reordering images:', error);
    }
  };

  const handleSetPrimary = async (mediaItem: ProductMedia) => {
    if (!currentProductId) return;
    try {
      await onSetPrimary({ mediaId: mediaItem.id, productId: currentProductId });
    } catch (error) {
      logger.error('Error setting primary image:', error);
    }
  };

  return (
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
              {item.is_primary && (
                <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                  <Star className="w-2.5 h-2.5 fill-current" /> Primary
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                {!item.is_primary && (
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => handleSetPrimary(item)}
                    disabled={isSettingPrimary}
                    className="text-xs h-7 px-2 bg-white/90 hover:bg-white text-black"
                  >
                    <Star className="w-3 h-3 mr-1" /> Set Primary
                  </Button>
                )}
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    onClick={() => handleMoveMedia(index, 'up')}
                    disabled={index === 0 || isReordering}
                    className="h-7 w-7 bg-white/90 hover:bg-white text-black"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    onClick={() => handleMoveMedia(index, 'down')}
                    disabled={index === media.length - 1 || isReordering}
                    className="h-7 w-7 bg-white/90 hover:bg-white text-black"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    type="button"
                    onClick={() => handleDeleteMedia(item)}
                    disabled={isDeleting}
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
            {isUploading ? (
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
              disabled={isUploading}
            />
          </label>
        </div>
        <p className="text-sm text-muted-foreground">
          Supported formats: JPEG, PNG, WebP, GIF. Max size: 5MB per image.
        </p>
      </CardContent>
    </Card>
  );
}
