import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import heroTexture from '@/assets/hero-texture.webp';
import kaariLogo from '@/assets/kaari-logo.webp';

const YarnBall3D = lazy(() => import('./YarnBall3D'));

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background texture */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroTexture})` }}
      />
      <div className="absolute inset-0 bg-kaari-dark/60" />

      {/* 3D Yarn Ball */}
      <div className="absolute inset-0 opacity-40">
        <Suspense fallback={null}>
          <YarnBall3D />
        </Suspense>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-6"
        >
          <img src={kaariLogo} alt="Kaari Handmade Logo" className="w-28 h-28 md:w-36 md:h-36 mx-auto object-contain" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="font-display text-5xl md:text-7xl lg:text-8xl text-primary-foreground font-bold mb-2 leading-tight"
        >
          कारी
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="font-display text-2xl md:text-4xl text-primary-foreground/90 mb-3 italic"
        >
          Handmade Crochet Collection
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="font-heritage text-kaari-cream/80 text-lg md:text-xl mb-10"
        >
          प्यार से बुनी गई खास डिज़ाइन्स — Unique designs woven with love
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link
            to="/products"
            className="yarn-button inline-block px-8 py-4 bg-primary text-primary-foreground font-body text-sm tracking-[0.15em] uppercase border border-kaari-gold/30 hover:bg-primary/90 transition-colors"
          >
            Explore Collection
          </Link>
          <a
            href="https://www.instagram.com/kaari.handmade"
            target="_blank"
            rel="noopener noreferrer"
            className="yarn-button inline-block px-8 py-4 border border-kaari-cream/40 text-kaari-cream font-body text-sm tracking-[0.15em] uppercase hover:bg-kaari-cream/10 transition-colors"
          >
            View Instagram
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float"
      >
        <div className="w-px h-16 bg-gradient-to-b from-kaari-gold/60 to-transparent" />
      </motion.div>
    </section>
  );
}
