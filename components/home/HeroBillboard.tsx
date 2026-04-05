'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Autoplay from 'embla-carousel-autoplay';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { BillboardProduct } from '@/lib/queries/top-products';

interface Props {
  products: BillboardProduct[];
}

export function HeroBillboard({ products }: Props) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const autoplayRef = useRef(
    Autoplay({ delay: 4500, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  useEffect(() => {
    if (!api) return;
    api.on('select', () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  const scrollTo = useCallback(
    (index: number) => {
      api?.scrollTo(index);
    },
    [api]
  );

  if (!products.length) {
    return (
      <section className="relative w-full h-[92vh] min-h-[560px] max-h-[900px] bg-stone-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-stone-500 font-body text-lg">No billboard products yet.</p>
          <p className="text-stone-400 font-body text-sm">
            Admin can add products via Admin → Billboard.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative w-full h-[92vh] min-h-[560px] max-h-[900px] overflow-hidden"
      aria-label="Featured products billboard"
      aria-roledescription="carousel"
    >
      <Carousel
        setApi={setApi}
        plugins={[autoplayRef.current]}
        opts={{ loop: true, align: 'start' }}
        className="w-full h-full"
      >
        <CarouselContent className="h-full ml-0">
          {products.map((product, index) => (
            <CarouselItem key={product.id} className="pl-0 h-full relative">
              {/* ── Background image ── */}
              <div className="absolute inset-0">
                <Image
                  src={product.imageUrl || '/placeholder.svg'}
                  alt={product.name}
                  fill
                  priority={index === 0}
                  fetchPriority={index === 0 ? 'high' : 'low'}
                  className="object-cover object-center"
                  sizes="100vw"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
                {/* Gradient overlay — darkens left side for text legibility */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
                {/* Bottom fade for dots */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/40 to-transparent" />
              </div>

              {/* ── Text content ── */}
              <div className="relative z-10 h-full flex items-center">
                <div className="max-w-7xl mx-auto px-6 md:px-16 w-full">
                  <AnimatePresence mode="wait">
                    {current === index && (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 36 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.55, ease: 'easeOut' }}
                        className="max-w-xl space-y-5"
                      >
                        {product.tag && (
                          <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm font-body text-xs tracking-widest uppercase">
                            {product.tag}
                          </Badge>
                        )}

                        <h2 className="font-display text-4xl md:text-6xl text-white leading-tight drop-shadow-md">
                          {product.name}
                        </h2>

                        <p className="font-body text-white/80 text-base md:text-lg leading-relaxed line-clamp-2">
                          {product.description}
                        </p>

                        <p className="font-display text-3xl font-bold text-white">
                          ₹{product.price.toLocaleString('en-IN')}
                        </p>

                        <div className="flex items-center gap-4 pt-1">
                          <Button
                            asChild
                            size="lg"
                            className="rounded-full px-8 h-12 font-body font-semibold shadow-xl"
                          >
                            <Link href={`/products/${product.slug}`} aria-label={`Shop ${product.name}`}>
                              Shop Now →
                            </Link>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            size="lg"
                            className="rounded-full px-8 h-12 font-body bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
                          >
                            <Link href={`/products/${product.slug}`}>View Details</Link>
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* ── Arrows ── */}
        <CarouselPrevious
          className="left-4 md:left-10 bg-white/20 border-white/30 text-white hover:bg-white/40 backdrop-blur-sm h-11 w-11"
          aria-label="Previous product"
        />
        <CarouselNext
          className="right-4 md:right-10 bg-white/20 border-white/30 text-white hover:bg-white/40 backdrop-blur-sm h-11 w-11"
          aria-label="Next product"
        />

        {/* ── Dot indicators ── */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10"
          role="tablist"
          aria-label="Slide indicators"
        >
          {products.map((p, i) => {
            const isSelected = i === current ? 'true' : 'false';
            return (
              <button
                key={p.id}
                role="tab"
                aria-selected={isSelected}
                aria-label={`Go to slide ${i + 1}: ${p.name}`}
                onClick={() => scrollTo(i)}
                className={`transition-all duration-300 rounded-full ${
                  i === current
                    ? 'w-8 h-2 bg-white'
                    : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            );
          })}
        </div>

        {/* ── Scroll hint ── */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 right-10 z-10 hidden md:flex flex-col items-center gap-1 text-white/60"
          aria-hidden="true"
        >
          <span className="font-body text-xs tracking-widest uppercase">Scroll</span>
          <svg className="w-4 h-6" viewBox="0 0 16 24" fill="none">
            <path
              d="M8 4v16M2 14l6 6 6-6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </motion.div>
      </Carousel>
    </section>
  );
}
