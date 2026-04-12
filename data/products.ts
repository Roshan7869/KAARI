/**
 * Static product data for Kaari Marketplace
 * In Next.js, images are served from the public directory
 */

export type Category = 'All' | 'Crochet Handbags' | 'Crochet Hair Accessories' | 'Crochet Dolls' | 'Crochet Keychains' | 'Crochet Bouquet';

export interface ProductReview {
  name: string;
  rating: number;
  text: string;
  date: string;
}

export interface Product {
  slug: string;
  name: string;
  category: Category;
  price: number;
  rating: number;
  reviewCount: number;
  description: string;
  images: string[];
  colors: string[];
  sizes: string[];
  reviews: ProductReview[];
}

export const categories: Category[] = [
  'All',
  'Crochet Handbags',
  'Crochet Hair Accessories',
  'Crochet Dolls',
  'Crochet Keychains',
  'Crochet Bouquet',
];

// In Next.js, static assets are served from public/
// So we reference images with paths starting from the public directory root
export const products: Product[] = [
  {
    slug: 'boho-sunburst-handbag',
    name: 'Boho Sunburst Handbag',
    category: 'Crochet Handbags',
    price: 1999,
    rating: 4.8,
    reviewCount: 24,
    description: 'A stunning handmade crochet handbag featuring a radiant sunburst pattern in warm earth tones. Each stitch is carefully crafted by our skilled artisans using premium cotton yarn that is both durable and soft to the touch.',
    images: ['/images/products/crochet-handbag-1.webp', '/images/products/crochet-handbag-2.webp'],
    colors: ['Earthy Brown', 'Cream White', 'Rust Orange', 'Olive Green'],
    sizes: ['Small', 'Medium', 'Large'],
    reviews: [
      { name: 'Priya S.', rating: 5, text: 'Absolutely beautiful bag! The craftsmanship is incredible and it goes with everything.', date: '2026-02-15' },
      { name: 'Ananya M.', rating: 5, text: 'Love the quality and the unique design. Gets compliments everywhere I go!', date: '2026-01-20' },
      { name: 'Ritu K.', rating: 4, text: 'Beautiful work, slightly smaller than expected but still gorgeous.', date: '2026-01-05' },
    ],
  },
  {
    slug: 'floral-tote-bag',
    name: 'Floral Crochet Tote',
    category: 'Crochet Handbags',
    price: 1999,
    rating: 4.9,
    reviewCount: 18,
    description: 'A spacious tote bag adorned with intricate floral crochet patterns in cream and brown. Perfect for daily use or as a statement fashion piece. Lined with soft cotton fabric for added durability.',
    images: ['/images/products/crochet-handbag-2.webp', '/images/products/crochet-handbag-1.webp'],
    colors: ['Brown & Cream', 'Pink & White', 'Navy & Gold'],
    sizes: ['Standard', 'Large'],
    reviews: [
      { name: 'Sneha R.', rating: 5, text: 'The most beautiful tote I own! So well made.', date: '2026-02-28' },
      { name: 'Kavya P.', rating: 5, text: 'Perfect size for everyday use. The floral pattern is divine.', date: '2026-02-10' },
    ],
  },
  {
    slug: 'orange-bloom-gajra',
    name: 'Orange Bloom Gajra',
    category: 'Crochet Hair Accessories',
    price: 299,
    rating: 4.7,
    reviewCount: 42,
    description: 'A vibrant crochet gajra featuring bright orange blooms with delicate white lace detailing. Perfect for festivals, weddings, and special occasions. Unlike fresh flowers, this gajra lasts forever.',
    images: ['/images/products/crochet-gajra-1.webp', '/images/products/crochet-gajra-2.webp'],
    colors: ['Orange & White', 'Pink & White', 'Yellow & White', 'Red & Gold'],
    sizes: ['Standard', 'Long'],
    reviews: [
      { name: 'Meera D.', rating: 5, text: 'Wore this to a wedding and got so many compliments! Looks just like real flowers.', date: '2026-03-01' },
      { name: 'Lakshmi N.', rating: 5, text: 'Beautiful alternative to real gajra. Lasts forever!', date: '2026-02-14' },
      { name: 'Divya T.', rating: 4, text: 'Very pretty and well-made. Slightly heavier than expected.', date: '2026-01-28' },
    ],
  },
  {
    slug: 'bridal-red-gajra',
    name: 'Bridal Red Gajra',
    category: 'Crochet Hair Accessories',
    price: 299,
    rating: 4.9,
    reviewCount: 31,
    description: 'An elegant bridal gajra in deep red and pristine white, handcrafted with fine crochet work. Each flower is individually crafted and assembled on a flexible thread for comfortable wearing.',
    images: ['/images/products/crochet-gajra-2.webp', '/images/products/crochet-gajra-1.webp'],
    colors: ['Red & White', 'Maroon & Gold', 'Pink & Pearl'],
    sizes: ['Standard', 'Long', 'Extra Long'],
    reviews: [
      { name: 'Sita V.', rating: 5, text: 'Used for my wedding and it was perfect! A beautiful keepsake.', date: '2026-02-20' },
    ],
  },
  {
    slug: 'pastel-bunny-doll',
    name: 'Pastel Bunny Doll',
    category: 'Crochet Dolls',
    price: 999,
    rating: 4.6,
    reviewCount: 15,
    description: 'An adorable handmade amigurumi bunny doll in soft pastel pink and cream. Made with hypoallergenic cotton yarn, safe for children. Each doll is stuffed with premium polyester fiberfill.',
    images: ['/images/products/crochet-doll-1.webp', '/images/products/crochet-doll-2.webp'],
    colors: ['Pink', 'Blue', 'Lavender', 'Mint Green'],
    sizes: ['Small (6")', 'Medium (10")', 'Large (14")'],
    reviews: [
      { name: 'Pooja G.', rating: 5, text: 'My daughter absolutely loves it! So soft and cuddly.', date: '2026-02-25' },
      { name: 'Nisha A.', rating: 4, text: 'Very cute doll, great for gifting.', date: '2026-02-01' },
    ],
  },
  {
    slug: 'teddy-bear-doll',
    name: 'Classic Teddy Bear',
    category: 'Crochet Dolls',
    price: 999,
    rating: 4.8,
    reviewCount: 22,
    description: 'A classic handmade crochet teddy bear in warm brown tones with adorable striped details. Perfect as a gift or nursery decoration. Made with child-safe materials.',
    images: ['/images/products/crochet-doll-2.webp', '/images/products/crochet-doll-1.webp'],
    colors: ['Brown', 'Honey', 'Grey', 'Cream'],
    sizes: ['Small (8")', 'Medium (12")', 'Large (16")'],
    reviews: [
      { name: 'Aarti S.', rating: 5, text: 'The cutest teddy bear! Made my baby shower gift extra special.', date: '2026-03-05' },
    ],
  },
  {
    slug: 'unicorn-keychain',
    name: 'Unicorn Yarn Keychain',
    category: 'Crochet Keychains',
    price: 299,
    rating: 4.5,
    reviewCount: 56,
    description: 'A colourful miniature crochet unicorn keychain with rainbow yarn tassel. A fun and unique accessory for your keys or bag. Handmade with attention to every tiny detail.',
    images: ['/images/products/crochet-keychain-1.webp', '/images/products/crochet-keychain-2.webp'],
    colors: ['Rainbow', 'Pink', 'Purple', 'Blue'],
    sizes: ['One Size'],
    reviews: [
      { name: 'Shruti B.', rating: 5, text: 'So adorable! Bought 5 as gifts for friends.', date: '2026-02-18' },
      { name: 'Tanvi R.', rating: 4, text: 'Very cute and well-made for the price.', date: '2026-01-15' },
    ],
  },
  {
    slug: 'rainbow-flower-keychain',
    name: 'Rainbow Flower Keychain',
    category: 'Crochet Keychains',
    price: 299,
    rating: 4.7,
    reviewCount: 38,
    description: 'A vibrant crochet flower keychain in rainbow colours with a gold-plated ring. Each petal is carefully formed to create a beautiful, long-lasting accessory.',
    images: ['/images/products/crochet-keychain-2.webp', '/images/products/crochet-keychain-1.webp'],
    colors: ['Rainbow', 'Sunset', 'Ocean', 'Forest'],
    sizes: ['One Size'],
    reviews: [
      { name: 'Ishita M.', rating: 5, text: 'Beautiful colours! Makes my keys look so pretty.', date: '2026-03-02' },
    ],
  },
  {
    slug: 'boho-scrunchie',
    name: 'Boho Crochet Scrunchie',
    category: 'Crochet Hair Accessories',
    price: 299,
    rating: 4.4,
    reviewCount: 67,
    description: 'A soft and stretchy crochet scrunchie in warm earth tones. Gentle on hair and adds a boho-chic touch to any hairstyle. Made with soft cotton-blend yarn.',
    images: ['/images/products/crochet-accessory-1.webp'],
    colors: ['Terracotta', 'Sage', 'Mustard', 'Blush'],
    sizes: ['One Size'],
    reviews: [
      { name: 'Neha J.', rating: 5, text: 'Love it! So gentle on my hair and looks great.', date: '2026-02-22' },
      { name: 'Simran K.', rating: 4, text: 'Nice quality, wish there were more colour options.', date: '2026-01-30' },
    ],
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByCategory(category: Category): Product[] {
  if (category === 'All') return products;
  return products.filter((p) => p.category === category);
}

export function getRelatedProducts(slug: string, limit = 3): Product[] {
  const product = getProductBySlug(slug);
  if (!product) return products.slice(0, limit);
  return products
    .filter((p) => p.slug !== slug && p.category === product.category)
    .concat(products.filter((p) => p.slug !== slug && p.category !== product.category))
    .slice(0, limit);
}