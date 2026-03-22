'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export default function ArtisanStory() {
  return (
    <section className="py-24 md:py-32 bg-gradient-warm">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="aspect-[4/5] overflow-hidden rounded-lg">
              <Image
                src="/images/artisan-story.webp"
                alt="Indian artisan crocheting with colorful yarn"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 border-2 border-accent opacity-40" />
          </motion.div>

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <p className="font-heritage text-accent text-sm tracking-[0.3em] uppercase mb-4">
              Our Story
            </p>
            <h2 className="font-display text-3xl md:text-5xl text-foreground mb-6 leading-tight">
              The Hands Behind<br />The Yarn
            </h2>
            <div className="w-16 h-px bg-accent mb-8" />
            <p className="font-heritage text-lg md:text-xl text-muted-foreground leading-relaxed mb-6">
              Kaari Handmade celebrates Indian women artisans who transform simple yarn
              into elegant crochet creations. Each piece tells a story of patience, skill,
              and generations of craft tradition passed down through time.
            </p>
            <p className="font-heritage text-lg text-muted-foreground leading-relaxed">
              From selecting the finest yarn to the final stitch, every creation is a labour
              of love — handcrafted with care in the heart of India.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}