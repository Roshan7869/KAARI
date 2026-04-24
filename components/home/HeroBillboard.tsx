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
  type CarouselApi,
} from '@/components/ui/carousel';
import type { BillboardProduct } from '@/lib/queries/top-products';

interface Props {
  products: BillboardProduct[];
}

export function HeroBillboard({ products }: Props) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const autoplayRef = useRef(
    Autoplay({ delay: 5500, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  useEffect(() => {
    if (!api) return;
    api.on('select', () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  const scrollTo = useCallback(
    (index: number) => api?.scrollTo(index),
    [api]
  );

  const goNext = useCallback(() => api?.scrollNext(), [api]);
  const goPrev = useCallback(() => api?.scrollPrev(), [api]);

  /* Parallax on mouse move — RAF throttled */
  const rafRef = useRef<number>(0);
  const pendingRef = useRef<{ x: number; y: number } | null>(null);

  const applyParallax = useCallback(() => {
    if (!pendingRef.current) return;
    const { x, y } = pendingRef.current;
    const bg = document.querySelector<HTMLElement>('.parallax-bg-active');
    if (bg) bg.style.transform = `translate3d(${x * 18}px,${y * 10}px,0) scale(1.04)`;
    pendingRef.current = null;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    pendingRef.current = { x, y };
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        applyParallax();
        rafRef.current = 0;
      });
    }
  }, [applyParallax]);

  const handleMouseLeave = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    pendingRef.current = null;
    const bg = document.querySelector<HTMLElement>('.parallax-bg-active');
    if (bg) bg.style.transform = '';
  }, []);

  if (!products.length) {
    return (
      <section className="relative w-full h-[calc(100vh-60px)] min-h-[500px] max-h-[820px] bg-maroon-deep flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[rgba(90,15,24,0.3)] to-[rgba(31,4,7,0.9)]" />
        <div className="relative z-10 text-center space-y-6 px-6">
          <h2 className="font-cormorant text-[clamp(36px,5vw,64px)] font-bold leading-tight tracking-tight text-white">
            Handcrafted with Love
          </h2>
          <p className="font-dm-sans text-sm leading-[1.75] text-white/60 max-w-md mx-auto">
            Discover unique crochet creations made by Indian artisans. Each piece tells a story of tradition and care.
          </p>
          <Link
            href="/products"
            className="h-12 px-7 bg-gold text-maroon-deep rounded-full text-[12.5px] font-dm-sans font-semibold tracking-[0.12em] uppercase inline-flex items-center gap-2 shadow-[0_8px_28px_rgba(212,175,127,0.4)] hover:bg-gold-light hover:-translate-y-0.5 transition-all duration-250"
          >
            Shop Now
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative w-full h-[calc(100vh-60px)] min-h-[500px] max-h-[820px] overflow-hidden bg-maroon-deep"
      aria-label="Featured products billboard"
      aria-roledescription="carousel"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <Carousel
        setApi={setApi}
        plugins={[autoplayRef.current]}
        opts={{ loop: true, align: 'start' }}
        className="w-full h-full"
        suppressHydrationWarning
      >
        <CarouselContent className="h-full ml-0">
          {products.map((product, index) => (
            <CarouselItem key={product.id} className="pl-0 h-full relative">
              {/* ── Slide background image with parallax ── */}
              <div
                className={`absolute inset-0 transition-transform duration-500 ease-out will-change-transform ${
                  current === index ? 'parallax-bg-active' : ''
                }`}
              >
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
              </div>

              {/* ── Gradient overlays (maroon/dark) ── */}
              <div className="absolute inset-0 bg-gradient-to-r from-[rgba(31,4,7,0.85)] via-[rgba(90,15,24,0.5)] to-[rgba(90,15,24,0.25)] z-[1]" />
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[rgba(31,4,7,0.5)] to-transparent z-[1]" />

              {/* ── Text content ── */}
              <div className="relative z-[2] h-full flex items-center">
                <div className="max-w-[1280px] mx-auto px-6 md:px-12 w-full">
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
                        {/* Eyebrow tag */}
                        {product.tag && (
                          <div className="inline-flex items-center gap-2.5">
                            <span className="w-7 h-px bg-gold opacity-60" />
                            <span className="text-[10px] font-dm-sans font-medium tracking-[0.25em] uppercase text-gold/75">
                              {product.tag}
                            </span>
                          </div>
                        )}

                        {/* Title */}
                        <h2 className="font-cormorant text-[clamp(42px,6vw,80px)] font-bold leading-[1.0] tracking-tight text-white">
                          {product.name}
                        </h2>

                        <p className="font-dm-sans text-sm leading-[1.75] text-white/60 max-w-[380px] line-clamp-2">
                          {product.description}
                        </p>

                        <p className="font-cormorant text-3xl font-bold text-gold">
                          ₹{product.price.toLocaleString('en-IN')}
                        </p>

                        {/* CTAs */}
                        <div className="flex items-center gap-3.5 pt-1 flex-wrap">
                          <Link
                            href={`/products/${product.slug}`}
                            className="h-12 px-7 bg-gold text-maroon-deep rounded-full text-[12.5px] font-dm-sans font-semibold tracking-[0.12em] uppercase inline-flex items-center gap-2 shadow-[0_8px_28px_rgba(212,175,127,0.4)] hover:bg-gold-light hover:-translate-y-0.5 transition-all duration-250"
                          >
                            Shop Now
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                          </Link>
                          <Link
                            href={`/products/${product.slug}`}
                            className="h-12 px-6 bg-transparent text-white/80 border border-white/25 rounded-full text-xs font-dm-sans font-medium tracking-[0.1em] inline-flex items-center gap-2 hover:bg-white/[0.08] hover:border-white/45 transition-all duration-250"
                          >
                            View Details
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* ── Glass arrows ── */}
      <div className="absolute top-1/2 -translate-y-1/2 z-10 w-full flex justify-between px-4 pointer-events-none">
        <button
          onClick={goPrev}
          className="w-11 h-11 rounded-full bg-[rgba(10,2,2,0.45)] border border-gold/35 text-gold pointer-events-auto flex items-center justify-center backdrop-blur-md hover:bg-maroon/70 transition-colors"
          aria-label="Previous slide"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <button
          onClick={goNext}
          className="w-11 h-11 rounded-full bg-[rgba(10,2,2,0.45)] border border-gold/35 text-gold pointer-events-auto flex items-center justify-center backdrop-blur-md hover:bg-maroon/70 transition-colors"
          aria-label="Next slide"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>

      {/* ── Dot indicators (pill for active) ── */}
      <div
        className="absolute bottom-7 left-1/2 -translate-x-1/2 flex items-center gap-2.5 z-10"
        role="tablist"
        aria-label="Slide indicators"
      >
        {products.map((p, i) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={i === current}
            aria-label={`Go to slide ${i + 1}: ${p.name}`}
            onClick={() => scrollTo(i)}
            className={`transition-all duration-300 rounded-full ${
              i === current
                ? 'w-7 h-3 bg-gold'
                : 'w-2 h-3 bg-white/30 hover:bg-white/60'
            }`}
          />
        ))}
      </div>

      {/* ── Watermark ── */}
      <div className="absolute bottom-5 right-7 z-[5] font-devanagari text-xs tracking-[0.2em] text-gold/35 pointer-events-none select-none">
        ❋ प्यार से बुनी गई
      </div>
    </section>
  );
}
