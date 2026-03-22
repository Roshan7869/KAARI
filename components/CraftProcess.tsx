'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

const steps = [
  {
    title: 'Selecting Yarn',
    description: 'Hand-picked premium yarn in rich, vibrant colours',
    image: '/images/yarn-selection.webp',
  },
  {
    title: 'Pattern Design',
    description: 'Traditional crochet patterns reimagined with modern aesthetics',
    image: '/images/product-2.webp',
  },
  {
    title: 'Hand Crocheting',
    description: 'Every stitch made by skilled artisan hands with love',
    image: '/images/hand-crocheting.webp',
  },
  {
    title: 'Finished Piece',
    description: 'A unique creation ready to be cherished',
    image: '/images/product-1.webp',
  },
];

export default function CraftProcess() {
  return (
    <section className="py-24 md:py-32 bg-secondary">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <p className="font-heritage text-accent text-sm tracking-[0.3em] uppercase mb-4">
            The Process
          </p>
          <h2 className="font-display text-3xl md:text-5xl text-foreground">
            How Yarn Becomes Art
          </h2>
        </motion.div>

        <div className="relative">
          {/* Thread line connecting steps */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-accent/40 to-transparent" />

          <div className="space-y-16 md:space-y-24">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, delay: index * 0.1 }}
                className={`grid md:grid-cols-2 gap-8 md:gap-16 items-center ${
                  index % 2 === 1 ? 'md:direction-rtl' : ''
                }`}
              >
                <div className={index % 2 === 1 ? 'md:order-2' : ''}>
                  <div className="aspect-square overflow-hidden fabric-card rounded-lg relative">
                    <Image
                      src={step.image}
                      alt={step.title}
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-700"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                </div>
                <div className={`${index % 2 === 1 ? 'md:order-1 md:text-right' : ''}`}>
                  <span className="font-heritage text-accent text-5xl md:text-7xl opacity-20 font-light">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="font-display text-2xl md:text-3xl text-foreground mt-2 mb-3">
                    {step.title}
                  </h3>
                  <p className="font-heritage text-muted-foreground text-lg">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}