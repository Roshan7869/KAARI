'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { getCloudinaryImageUrl } from '@/lib/cloudinary';

const artisanSrc = process.env.NEXT_PUBLIC_CLD_ARTISAN_STORY
  ? getCloudinaryImageUrl(process.env.NEXT_PUBLIC_CLD_ARTISAN_STORY, { quality: 'auto', format: 'auto' })
  : '/images/artisan-story.webp';

const STATS = [
  { value: '500+', label: 'Happy Customers' },
  { value: '100%', label: 'Handcrafted' },
  { value: '3+', label: 'Years of Love' },
] as const;

export default function ArtisanStory() {
  return (
    <section className="py-24 md:py-32 bg-maroon-deep relative overflow-hidden" suppressHydrationWarning>
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0id2hpdGUiLz48L3N2Zz4=')]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-lg">
              <Image
                src={artisanSrc}
                alt="Indian artisan crocheting with colorful yarn"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 border-2 border-gold/30 rounded-sm" />
          </motion.div>

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2.5 mb-5">
              <span className="w-7 h-px bg-gold opacity-60" />
              <span className="text-[10px] font-dm-sans font-medium tracking-[0.25em] uppercase text-gold/75">
                Our Story
              </span>
            </div>

            <h2 className="font-cormorant text-3xl md:text-5xl text-white mb-6 leading-tight font-semibold">
              The Hands Behind<br />The Yarn
            </h2>

            <div className="w-16 h-px bg-gold/40 mb-8" />

            <p className="font-dm-sans text-base md:text-lg text-white/60 leading-relaxed mb-6">
              Kaari Handmade celebrates Indian women artisans who transform simple yarn
              into elegant crochet creations. Each piece tells a story of patience, skill,
              and generations of craft tradition passed down through time.
            </p>
            <p className="font-dm-sans text-base text-white/50 leading-relaxed mb-8">
              From selecting the finest yarn to the final stitch, every creation is a labour
              of love — handcrafted with care in the heart of India.
            </p>

            {/* Stats row */}
            <div className="flex items-center gap-8 mb-8 pb-8 border-b border-white/10">
              {STATS.map(({ value, label }) => (
                <div key={label}>
                  <p className="font-cormorant text-2xl md:text-3xl font-bold text-gold">{value}</p>
                  <p className="font-dm-sans text-[11px] text-white/45 tracking-wider uppercase">{label}</p>
                </div>
              ))}
            </div>

            <Link
              href="/about"
              className="h-12 px-7 bg-gold text-maroon-deep rounded-full text-[12.5px] font-dm-sans font-semibold tracking-[0.12em] uppercase inline-flex items-center gap-2 shadow-[0_8px_28px_rgba(212,175,127,0.25)] hover:bg-gold-light hover:-translate-y-0.5 transition-all duration-250"
            >
              Read Our Story
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}