'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';

// Parallax scroll hook
function useParallax(value: number, distance: number) {
  return useTransform(useScroll().scrollY, [0, 1], [value, distance]);
}

// Mouse position hook for interactive effects
function useMousePosition() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return position;
}

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePosition = useMousePosition();
  const { scrollY } = useScroll();

  // Parallax transforms
  const backgroundY = useTransform(scrollY, [0, 500], [0, 150]);
  const contentY = useTransform(scrollY, [0, 500], [0, 50]);
  const logoRotate = useTransform(mousePosition.x, [-10, 10], [-5, 5]);
  const logoScale = useTransform(scrollY, [0, 200], [1, 0.8]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.6, -0.05, 0.01, 0.99],
      },
    },
  };

  const logoVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: 'easeOut',
      },
    },
  };

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Parallax Background Layer */}
      <motion.div
        style={{ y: backgroundY }}
        className="absolute inset-0 z-0"
      >
        <Image
          src="/images/hero-texture.webp"
          alt="Hero background texture"
          fill
          priority
          className="object-cover"
          sizes="100vw"
          placeholder="blur"
          blurDataURL="data:image/webp;base64,UklGRlAAAABXRUJQVlA4IEQAAADQAQCdASoKAAoAAUAmJYgCdAEOdI0WMQAAL"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-kaari-dark/70 via-kaari-dark/60 to-kaari-dark/80" />
      </motion.div>

      {/* Floating Particles Effect */}
      <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-kaari-gold/30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Glassmorphism Overlay Card */}
      <motion.div
        style={{ y: contentY }}
        className="relative z-10 w-full max-w-5xl mx-auto px-6"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="glass-card-dark p-8 md:p-12 rounded-2xl text-center"
        >
          {/* Logo */}
          <motion.div
            variants={logoVariants}
            style={{ rotate: logoRotate, scale: logoScale }}
            className="mb-6"
          >
            <div className="relative w-28 h-28 md:w-36 md:h-36 mx-auto">
              <Image
                src="/images/kaari-logo.webp"
                alt="Kaari Handmade Logo"
                fill
                className="object-contain drop-shadow-2xl"
                sizes="(max-width: 768px) 112px, 144px"
                priority
              />
            </div>
          </motion.div>

          {/* Brand Name */}
          <motion.h1
            variants={itemVariants}
            className="font-display text-5xl md:text-7xl lg:text-8xl text-primary-foreground font-bold mb-2 leading-tight"
          >
            कारी
          </motion.h1>

          {/* Tagline */}
          <motion.p
            variants={itemVariants}
            className="font-display text-2xl md:text-4xl text-primary-foreground/90 mb-3 italic"
          >
            Handmade Crochet Collection
          </motion.p>

          {/* Description */}
          <motion.p
            variants={itemVariants}
            className="font-heritage text-kaari-cream/80 text-lg md:text-xl mb-10 max-w-2xl mx-auto"
          >
            प्यार से बुनी गई खास डिज़ाइन्स — Unique designs woven with love
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/products"
              className="yarn-button glass-button inline-block px-8 py-4 bg-primary text-primary-foreground font-body text-sm tracking-[0.15em] uppercase border border-kaari-gold/30 hover:bg-primary/90 transition-all duration-300 rounded-lg"
            >
              <span className="relative z-10">Explore Collection</span>
            </Link>
            <a
              href="https://www.instagram.com/kaari.handmade"
              target="_blank"
              rel="noopener noreferrer"
              className="yarn-button glass-button inline-block px-8 py-4 border border-kaari-cream/40 text-kaari-cream font-body text-sm tracking-[0.15em] uppercase hover:bg-kaari-cream/10 transition-all duration-300 rounded-lg"
            >
              <span className="relative z-10">View Instagram</span>
            </a>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center gap-2"
        >
          <span className="text-kaari-cream/60 text-xs uppercase tracking-widest">
            Scroll
          </span>
          <div className="w-6 h-10 border-2 border-kaari-cream/30 rounded-full flex justify-center">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 bg-kaari-gold rounded-full mt-2"
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Gradient Overlay at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-[2]" />
    </section>
  );
}