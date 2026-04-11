'use client';

import Image from 'next/image';
import { Instagram, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

const POSTS = [
  {
    src: '/images/products_webp/crochet-handbag-1.webp',
    alt: 'Crochet handbag',
  },
  {
    src: '/images/products_webp/crochet-handbag-2.webp',
    alt: 'Crochet handbag detail',
  },
  {
    src: '/images/products_webp/crochet-gajra-1.webp',
    alt: 'Crochet gajra',
  },
  {
    src: '/images/products_webp/crochet-gajra-2.webp',
    alt: 'Crochet accessories',
  },
  {
    src: '/images/products_webp/crochet-keychain-1.webp',
    alt: 'Crochet keychain',
  },
  {
    src: '/images/products_webp/crochet-doll-1.webp',
    alt: 'Crochet doll',
  },
];

const INSTAGRAM_URL = 'https://www.instagram.com/kaari.handmade';

export function InstagramFeed() {
  return (
    <section className="py-20 bg-ivory">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-10"
        >
          <p className="font-dm-sans text-xs text-maroon/50 tracking-[0.25em] uppercase mb-3">
            Follow Along
          </p>
          <h2 className="font-cormorant text-3xl md:text-5xl text-maroon-deep font-semibold mb-3">
            @kaari.handmade
          </h2>
          <p className="font-dm-sans text-maroon/45 text-sm">
            Tag us in your photos for a chance to be featured
          </p>
        </motion.div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-1 mb-8">
          {POSTS.map((post, i) => (
            <motion.a
              key={i}
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="group relative aspect-square overflow-hidden bg-cream-warm"
              aria-label={`View ${post.alt} on Instagram`}
            >
              <Image
                src={post.src}
                alt={post.alt}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                sizes="(max-width: 768px) 33vw, 16vw"
              />
              <div className="absolute inset-0 bg-maroon/0 group-hover:bg-maroon/70 transition-colors duration-300 flex items-center justify-center">
                <Heart className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </motion.a>
          ))}
        </div>

        <div className="text-center">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-11 px-8 rounded-full border border-maroon/15 text-maroon font-dm-sans text-xs tracking-[0.15em] uppercase hover:bg-maroon hover:text-white transition-all duration-300"
          >
            <Instagram className="w-4 h-4" aria-hidden />
            Follow Us on Instagram
          </a>
        </div>
      </div>
    </section>
  );
}
