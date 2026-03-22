'use client'
import { motion } from 'framer-motion';
import { useEffect } from 'react';

export default function InstagramFeature() {
  useEffect(() => {
    // Load Instagram embed script
    const script = document.createElement('script');
    script.src = '//www.instagram.com/embed.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <section className="py-20 md:py-28 bg-gradient-warm relative overflow-hidden">
      {/* Subtle knit texture overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 3px, hsl(var(--foreground)) 3px, hsl(var(--foreground)) 4px),
          repeating-linear-gradient(90deg, transparent, transparent 3px, hsl(var(--foreground)) 3px, hsl(var(--foreground)) 4px)`
      }} />

      <div className="relative z-10 max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <p className="font-heritage text-accent text-sm tracking-[0.3em] uppercase mb-3">
            Follow Our Journey
          </p>
          <h2 className="font-display text-3xl md:text-5xl text-foreground mb-4">
            From Our Instagram
          </h2>
          <p className="font-heritage text-muted-foreground max-w-lg mx-auto">
            See our latest crochet creations and behind-the-scenes moments at @kaari.handmade
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex justify-center"
        >
          {/* Framed Instagram embed */}
          <div className="relative p-3 md:p-5 border border-border bg-card rounded-sm shadow-lg max-w-[540px] w-full">
            {/* Corner decorations - crochet stitch accents */}
            <div className="absolute top-1.5 left-1.5 w-4 h-4 border-t-2 border-l-2 border-accent opacity-60" />
            <div className="absolute top-1.5 right-1.5 w-4 h-4 border-t-2 border-r-2 border-accent opacity-60" />
            <div className="absolute bottom-1.5 left-1.5 w-4 h-4 border-b-2 border-l-2 border-accent opacity-60" />
            <div className="absolute bottom-1.5 right-1.5 w-4 h-4 border-b-2 border-r-2 border-accent opacity-60" />

            <blockquote
              className="instagram-media"
              data-instgrm-captioned
              data-instgrm-permalink="https://www.instagram.com/p/DQa54VCEoSp/?utm_source=ig_embed&utm_campaign=loading"
              data-instgrm-version="14"
              style={{
                background: 'hsl(var(--card))',
                border: 0,
                borderRadius: '3px',
                margin: '0 auto',
                maxWidth: '540px',
                minWidth: '326px',
                width: '100%',
              }}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-10"
        >
          <a
            href="https://www.instagram.com/kaari.handmade"
            target="_blank"
            rel="noopener noreferrer"
            className="yarn-button inline-block px-8 py-3 border border-primary text-primary font-body text-sm tracking-[0.15em] uppercase hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            Follow @kaari.handmade
          </a>
        </motion.div>
      </div>
    </section>
  );
}
