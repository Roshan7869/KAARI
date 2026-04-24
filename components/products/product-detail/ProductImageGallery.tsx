'use client';

import Image from 'next/image';
import { ZoomIn } from 'lucide-react';
import { resolveProductImageUrl } from '@/lib/product-media';
import { cn } from '@/lib/utils';
import type { ProductMedia } from './types';

interface ProductImageGalleryProps {
  images: ProductMedia[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
  onZoomOpen: () => void;
  productTitle: string;
}

export function ProductImageGallery({
  images,
  selectedIdx,
  onSelect,
  onZoomOpen,
  productTitle,
}: ProductImageGalleryProps) {
  const primaryImage = images[selectedIdx] ?? images[0];

  return (
    <div className="lg:sticky lg:top-20 space-y-3 self-start">
      {/* Main image */}
      <div
        className="aspect-[4/5] rounded-sm overflow-hidden bg-stone-100 relative group cursor-zoom-in"
        onClick={onZoomOpen}
      >
        {primaryImage?.file_path ? (
          <Image
            src={resolveProductImageUrl(primaryImage.file_path)}
            alt={primaryImage.alt_text ?? productTitle}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            No image available
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onZoomOpen(); }}
          className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
          aria-label="Zoom image"
        >
          <ZoomIn className="w-4 h-4 text-stone-600" />
        </button>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelect(idx)}
              className={cn(
                'flex-shrink-0 w-[70px] h-[70px] rounded-sm overflow-hidden bg-stone-100 border-2 transition-all',
                idx === selectedIdx
                  ? 'border-[#8B1F2A] ring-1 ring-[#8B1F2A]/30'
                  : 'border-transparent hover:border-stone-300',
              )}
            >
              <Image
                src={resolveProductImageUrl(img.file_path)}
                alt={img.alt_text ?? `${productTitle} ${idx + 1}`}
                width={70}
                height={70}
                className="object-cover w-full h-full"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
