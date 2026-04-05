import { motion } from 'framer-motion';
import ProductCard from './ProductCard';
import { getRelatedProducts } from '@/data/products';

interface RelatedProductsProps {
  currentSlug: string;
}

export default function RelatedProducts({ currentSlug }: RelatedProductsProps) {
  const related = getRelatedProducts(currentSlug);

  return (
    <section className="py-16 bg-gradient-warm">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="font-heritage text-accent text-sm tracking-[0.3em] uppercase mb-3">
            You May Also Like
          </p>
          <h2 className="font-display text-3xl text-foreground">
            Related Creations
          </h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {related.map((p, i) => (
            <ProductCard key={p.slug} product={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
