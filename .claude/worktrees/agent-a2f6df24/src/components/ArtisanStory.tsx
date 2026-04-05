import { motion } from 'framer-motion';
import artisanImg from '@/assets/artisan-story.webp';

export default function ArtisanStory() {
  return (
    <section className="py-24 md:py-32 bg-gradient-warm relative overflow-hidden">
      {/* Decorative glassmorphism background elements */}
      <div className="absolute top-20 right-10 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-20 left-10 w-48 h-48 rounded-full bg-accent/5 blur-2xl" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="aspect-[4/5] overflow-hidden glass-card glass-hover">
              <img
                src={artisanImg}
                alt="Indian artisan crocheting with colorful yarn"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            {/* Decorative frame with glassmorphism */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 glass-card-dark border-2 border-accent/30" />
            <div className="absolute -top-2 -left-2 w-16 h-16 glass-card border border-primary/20" />
          </motion.div>

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="glass-card p-8 md:p-10"
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
