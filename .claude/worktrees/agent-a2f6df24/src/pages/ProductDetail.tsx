import { useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { getProductBySlug } from '@/data/products';
import ProductGalleryComponent from '@/components/products/ProductGallery';
import ProductCustomization from '@/components/products/ProductCustomization';
import ProductReviews from '@/components/products/ProductReviews';
import RelatedProducts from '@/components/products/RelatedProducts';
import CrochetDivider from '@/components/CrochetDivider';
import KaariFooter from '@/components/KaariFooter';
import Navbar from '@/components/Navbar';
import { Star } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const product = slug ? getProductBySlug(slug) : undefined;

  useEffect(() => {
    if (!product) return;
    trackEvent('view_item', {
      item_id: product.slug,
      item_name: product.name,
      item_category: product.category,
      price: product.price,
      currency: 'INR',
    });
  }, [product]);

  if (!product) return <Navigate to="/products" replace />;

  return (
    <main className="overflow-x-hidden">
      <Navbar variant="solid" />

      <div className="pt-24 pb-16">
        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-6 mb-8">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Collection
          </Link>
        </div>

        {/* Product Detail */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Gallery */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <ProductGalleryComponent images={product.images} name={product.name} />
            </motion.div>

            {/* Details */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-6"
            >
              <div>
                <p className="font-heritage text-accent text-sm tracking-[0.3em] uppercase mb-2">
                  {product.category}
                </p>
                <h1 className="font-display text-3xl md:text-4xl text-foreground mb-3">
                  {product.name}
                </h1>
                <div className="flex items-center gap-3">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(product.rating) ? 'fill-accent text-accent' : 'text-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-body text-sm text-muted-foreground">
                    {product.rating} ({product.reviewCount} reviews)
                  </span>
                </div>
              </div>

              <p className="font-display text-3xl text-primary font-bold">
                ₹{product.price.toLocaleString('en-IN')}
              </p>

              <p className="font-heritage text-foreground/80 text-base leading-relaxed">
                {product.description}
              </p>

              {/* Customization */}
              <div className="pt-4">
                <ProductCustomization product={product} />
              </div>
            </motion.div>
          </div>
        </div>

        <CrochetDivider />

        {/* Reviews */}
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <p className="font-heritage text-accent text-sm tracking-[0.3em] uppercase mb-3">
              What Our Customers Say
            </p>
            <h2 className="font-display text-3xl text-foreground">Customer Reviews</h2>
          </motion.div>
          <ProductReviews
            reviews={product.reviews}
            averageRating={product.rating}
            totalReviews={product.reviewCount}
          />
        </div>

        <CrochetDivider />
      </div>

      <RelatedProducts currentSlug={product.slug} />
      <CrochetDivider />
      <KaariFooter />
    </main>
  );
}