'use client'
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { resolveProductImageUrl } from '@/lib/product-media';

interface ProductGalleryProps {
  images: string[];
  name: string;
}

export default function ProductGallery({ images, name }: ProductGalleryProps) {
  const [selected, setSelected] = useState(0);

  return (
    <div className="space-y-4">
      {/* Main Image — wrapped in motion.div so Next.js Image handles optimization */}
      <div className="aspect-[3/4] relative overflow-hidden rounded-sm border border-border">
        <AnimatePresence mode="wait">
          <motion.div
            key={selected}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <Image
              src={resolveProductImageUrl(images[selected])}
              alt={`${name} - view ${selected + 1}`}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-3">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              aria-label={`View ${name} image ${i + 1}`}
              aria-pressed={selected === i ? 'true' : 'false'}
              className={`relative w-20 h-20 overflow-hidden rounded-sm border-2 transition-all duration-300 ${
                selected === i ? 'border-primary' : 'border-border opacity-60 hover:opacity-100'
              }`}
            >
              <Image
                src={resolveProductImageUrl(img)}
                alt={`${name} thumbnail ${i + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
