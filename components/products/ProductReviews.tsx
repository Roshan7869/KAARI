'use client'
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import type { ProductReview } from '@/data/products';

interface ProductReviewsProps {
  reviews: ProductReview[];
  averageRating: number;
  totalReviews: number;
}

export default function ProductReviews({ reviews, averageRating, totalReviews }: ProductReviewsProps) {
  return (
    <div className="space-y-8">
      {/* Average Rating */}
      <div className="text-center py-6 border-y border-border">
        <p className="font-display text-4xl text-foreground font-bold">{averageRating}</p>
        <div className="flex justify-center my-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-5 h-5 ${
                i < Math.floor(averageRating) ? 'fill-accent text-accent' : 'text-muted'
              }`}
            />
          ))}
        </div>
        <p className="font-body text-sm text-muted-foreground">
          Based on {totalReviews} reviews
        </p>
      </div>

      {/* Reviews */}
      <div className="space-y-6">
        {reviews.map((review, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="p-5 fabric-card"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-body text-sm font-medium text-foreground">{review.name}</p>
                <p className="font-body text-xs text-muted-foreground">{review.date}</p>
              </div>
              <div className="flex">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className={`w-3.5 h-3.5 ${
                      j < review.rating ? 'fill-accent text-accent' : 'text-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="font-heritage text-foreground/80 text-sm leading-relaxed italic">
              "{review.text}"
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
