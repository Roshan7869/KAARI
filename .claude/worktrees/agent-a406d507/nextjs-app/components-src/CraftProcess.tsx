import { motion } from 'framer-motion';
import yarnSelection from '@/assets/yarn-selection.webp';
import handCrocheting from '@/assets/hand-crocheting.webp';
import product1 from '@/assets/product-1.webp';
import product2 from '@/assets/product-2.webp';

const steps = [
  {
    title: 'Selecting Yarn',
    description: 'Hand-picked premium yarn in rich, vibrant colours',
    image: yarnSelection,
  },
  {
    title: 'Pattern Design',
    description: 'Traditional crochet patterns reimagined with modern aesthetics',
    image: product2,
  },
  {
    title: 'Hand Crocheting',
    description: 'Every stitch made by skilled artisan hands with love',
    image: handCrocheting,
  },
  {
    title: 'Finished Piece',
    description: 'A unique creation ready to be cherished',
    image: product1,
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
                  <div className="aspect-square overflow-hidden fabric-card">
                    <img
                      src={step.image}
                      alt={step.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                      loading="lazy"
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
