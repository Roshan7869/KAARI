'use client';

import Image from 'next/image';
import { X } from 'lucide-react';
import { resolveProductImageUrl } from '@/lib/product-media';
import type { ProductMedia } from './types';

interface ProductZoomLightboxProps {
  open: boolean;
  image: ProductMedia | null;
  productTitle: string;
  onClose: () => void;
}

export function ProductZoomLightbox({
  open,
  image,
  productTitle,
  onClose,
}: ProductZoomLightboxProps) {
  if (!open || !image) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 cursor-zoom-out"
      onClick={onClose}
    >
      <div className="relative max-w-3xl max-h-full" onClick={(e) => e.stopPropagation()}>
        <Image
          src={resolveProductImageUrl(image.file_path)}
          alt={image.alt_text ?? productTitle}
          width={900}
          height={1125}
          className="object-contain max-h-[85vh] rounded-sm"
        />
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow"
          aria-label="Close zoom"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
