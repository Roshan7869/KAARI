import { motion } from 'framer-motion';
import product1 from '@/assets/product-1.webp';
import product2 from '@/assets/product-2.webp';
import product3 from '@/assets/product-3.webp';

const products = [
  { image: product1, title: 'Crochet Dress', category: 'Apparel' },
  { image: product2, title: 'Crochet Tote Bag', category: 'Accessories' },
  { image: product3, title: 'Crochet Shawl', category: 'Wraps' },
];

export default function ProductGallery() {
  return (
    <section id="collection" className="py-24 md:py-32 bg-gradient-warm">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <p className="font-heritage text-accent text-sm tracking-[0.3em] uppercase mb-4">
            Our Creations
          </p>
          <h2 className="font-display text-3xl md:text-5xl text-foreground">
            Crochet Creations
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {products.map((product, index) => (
            <motion.div
              key={product.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="group glass-card glass-hover cursor-pointer"
            >
              <div className="aspect-[3/4] overflow-hidden relative">
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-kaari-dark/80 via-kaari-dark/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {/* Glassmorphism overlay on hover */}
                <motion.div
                  className="absolute inset-x-0 bottom-0 p-4 bg-white/10 backdrop-blur-md border-t border-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"
                >
                  <p className="font-heritage text-white text-xs tracking-[0.2em] uppercase mb-1">
                    View Details
                  </p>
                </motion.div>
              </div>
              <div className="p-5 bg-white/5 backdrop-blur-sm">
                <p className="font-heritage text-accent text-xs tracking-[0.2em] uppercase mb-1">
                  {product.category}
                </p>
                <h3 className="font-display text-xl text-foreground">
                  {product.title}
                </h3>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
