-- ============================================================
-- Seed catalog: 28 products with correct prices, variants, and media
--
-- Categories & pricing:
--   Crochet Hair Accessories  → ₹299
--   Crochet Handbags           → ₹1999
--   Crochet Dolls              → ₹999
--   Crochet Bouquet            → ₹499
--   Crochet Keychains          → ₹299
--
-- Media paths use local /images/ prefix so resolveProductImageUrl()
-- returns them as-is (no Cloudinary or Storage transform needed).
-- ============================================================

BEGIN;

-- ── Products ──────────────────────────────────────────────────────────────

INSERT INTO public.products (
  title, slug, description, base_price, currency, category,
  product_type, is_active, allow_customization,
  has_color_selector, has_size_selector, show_related_products
) VALUES

-- ── Hair Accessories (₹299 each) ──────────────────────────────────────
('Flower Hair Clip', 'flower-hair-clip',
 'Handmade crochet flower hair clip, perfect for adding a touch of elegance to any outfit.',
 299, 'INR', 'Crochet Hair Accessories', 'standard', true, false, false, false, true),

('Hair Band', 'hair-band',
 'Beautifully crocheted hair band that keeps your hair in style all day long.',
 299, 'INR', 'Crochet Hair Accessories', 'standard', true, false, false, false, true),

('Pink Hair Jhoomar', 'pink-hair-jhoomar',
 'Stunning pink crochet hair jhoomar, ideal for festive occasions and celebrations.',
 299, 'INR', 'Crochet Hair Accessories', 'standard', true, false, false, false, true),

('Red Hair Gajra', 'red-hair-gajra',
 'Traditional red crochet hair gajra that adds a classic touch to your look.',
 299, 'INR', 'Crochet Hair Accessories', 'standard', true, false, false, false, true),

('Red Hair Jhoomar', 'red-hair-jhoomar',
 'Vibrant red crochet hair jhoomar, handcrafted with love for special moments.',
 299, 'INR', 'Crochet Hair Accessories', 'standard', true, false, false, false, true),

('Red Hair Clip', 'red-hair-clip',
 'Elegant red crochet hair clip, a charming accessory for everyday wear.',
 299, 'INR', 'Crochet Hair Accessories', 'standard', true, false, false, false, true),

('Rose Clip', 'rose-clip',
 'Delicate rose-patterned crochet hair clip, perfect for a romantic finish.',
 299, 'INR', 'Crochet Hair Accessories', 'standard', true, false, false, false, true),

('Rubber Hair Gajra', 'rubber-hair-gajra',
 'Comfortable rubber-backed crochet hair gajra, easy to wear and secure.',
 299, 'INR', 'Crochet Hair Accessories', 'standard', true, false, false, false, true),

('Sunflower Hair Clip', 'sunflower-hair-clip',
 'Cheerful sunflower crochet hair clip that brightens any hairstyle.',
 299, 'INR', 'Crochet Hair Accessories', 'standard', true, false, false, false, true),

('Yellow Hair Jhoomar', 'yellow-hair-jhoomar',
 'Bright yellow crochet hair jhoomar, a beautiful accent for festive styling.',
 299, 'INR', 'Crochet Hair Accessories', 'standard', true, false, false, false, true),

('Blue Hair Clip', 'blue-hair-clip',
 'Cool blue crochet hair clip for a fresh and breezy look.',
 299, 'INR', 'Crochet Hair Accessories', 'standard', true, false, false, false, true),

('Pink Hair Gajra', 'pink-hair-gajra',
 'Soft pink crochet hair gajra, a timeless accessory for any occasion.',
 299, 'INR', 'Crochet Hair Accessories', 'standard', true, false, false, false, true),

('Yellow Hair Clip', 'yellow-hair-clip',
 'Sunny yellow crochet hair clip that adds warmth to your everyday style.',
 299, 'INR', 'Crochet Hair Accessories', 'standard', true, false, false, false, true),

-- ── Hand Bags (₹1999 each) ─────────────────────────────────────────────
('Handy Bags', 'handy-bags',
 'Handy crochet bag combining practicality with artisanal craftsmanship.',
 1999, 'INR', 'Crochet Handbags', 'standard', true, false, false, false, true),

('Lily Bag', 'lily-bag',
 'Elegant lily-inspired crochet handbag, perfect for both casual and formal outings.',
 1999, 'INR', 'Crochet Handbags', 'standard', true, false, false, false, true),

('Pink White Flower Bag', 'pink-white-flower-bag',
 'Charming pink and white flower crochet bag, a delightful statement piece.',
 1999, 'INR', 'Crochet Handbags', 'standard', true, false, false, false, true),

('Rose Petal Bag', 'rose-petal-bag',
 'Beautiful rose petal crochet handbag, lovingly handcrafted for you.',
 1999, 'INR', 'Crochet Handbags', 'standard', true, false, false, false, true),

('Rose Bag', 'rose-bag',
 'Stunning rose-patterned crochet bag, a perfect blend of art and utility.',
 1999, 'INR', 'Crochet Handbags', 'standard', true, false, false, false, true),

('Sunflower Petal Bag', 'sunflower-petal-bag',
 'Bright sunflower petal crochet bag that carries sunshine wherever you go.',
 1999, 'INR', 'Crochet Handbags', 'standard', true, false, false, false, true),

('Sunflower Design Bag', 'sunflower-design-bag',
 'Artistic sunflower design crochet bag, handcrafted with intricate detail.',
 1999, 'INR', 'Crochet Handbags', 'standard', true, false, false, false, true),

('White Flower Bag', 'white-flower-bag',
 'Classic white flower crochet bag, elegant and versatile for any occasion.',
 1999, 'INR', 'Crochet Handbags', 'standard', true, false, false, false, true),

-- ── Teddy / Doll (₹999) ────────────────────────────────────────────────
('Classic Teddy Bear', 'classic-teddy-bear',
 'Adorable handcrafted crochet teddy bear, a perfect gift for loved ones.',
 999, 'INR', 'Crochet Dolls', 'standard', true, false, false, false, true),

-- ── Bouquet (₹499) ─────────────────────────────────────────────────────
('Sunflower Bouquet', 'sunflower-bouquet',
 'Beautiful crochet sunflower bouquet that never wilts — a forever gift.',
 499, 'INR', 'Crochet Bouquet', 'standard', true, false, false, false, true),

-- ── Key Chains (₹299 each) ─────────────────────────────────────────────
('Ball Key Chain', 'ball-key-chain',
 'Cute crochet ball key chain, a small delight for your everyday carry.',
 299, 'INR', 'Crochet Keychains', 'standard', true, false, false, false, true),

('Heart Key Chain', 'heart-key-chain',
 'Lovely heart crochet key chain, a sweet handmade accessory.',
 299, 'INR', 'Crochet Keychains', 'standard', true, false, false, false, true),

('Virat Kohli Key Chain', 'virat-kohli-key-chain',
 'Cricket-inspired crochet key chain — a must-have for fans of the game.',
 299, 'INR', 'Crochet Keychains', 'standard', true, false, false, false, true),

('Turtle Key Chain', 'turtle-key-chain',
 'Adorable turtle crochet key chain, handcrafted with care.',
 299, 'INR', 'Crochet Keychains', 'standard', true, false, false, false, true),

('Yellow Key Chain', 'yellow-key-chain',
 'Bright yellow crochet key chain to add cheer to your keys.',
 299, 'INR', 'Crochet Keychains', 'standard', true, false, false, false, true)

ON CONFLICT (slug) DO UPDATE SET
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  base_price   = EXCLUDED.base_price,
  category     = EXCLUDED.category,
  product_type = EXCLUDED.product_type,
  is_active    = EXCLUDED.is_active,
  updated_at   = now();


-- ── Variants (1 default variant per product) ────────────────────────────────

INSERT INTO public.product_variants (product_id, sku, size, color, material, price, stock_qty, is_default)
SELECT
  p.id,
  'SKU-' || replace(upper(p.slug), '-', '_'),
  'Standard',
  NULL,
  'Cotton',
  p.base_price,
  20,
  true
FROM public.products p
WHERE p.slug IN (
  'flower-hair-clip','hair-band','pink-hair-jhoomar','red-hair-gajra',
  'red-hair-jhoomar','red-hair-clip','rose-clip','rubber-hair-gajra',
  'sunflower-hair-clip','yellow-hair-jhoomar','blue-hair-clip',
  'pink-hair-gajra','yellow-hair-clip',
  'handy-bags','lily-bag','pink-white-flower-bag','rose-petal-bag',
  'rose-bag','sunflower-petal-bag','sunflower-design-bag','white-flower-bag',
  'classic-teddy-bear','sunflower-bouquet',
  'ball-key-chain','heart-key-chain','virat-kohli-key-chain',
  'turtle-key-chain','yellow-key-chain'
)
ON CONFLICT DO NOTHING;


-- ── Media entries (local /images/ paths) ───────────────────────────────────
-- resolveProductImageUrl() returns /images/ paths as-is,
-- so these will work with Next.js Image out of the box.

-- Helper: delete stale media before re-inserting (idempotent)
DELETE FROM public.product_media
WHERE product_id IN (
  SELECT id FROM public.products
  WHERE slug IN (
    'flower-hair-clip','hair-band','pink-hair-jhoomar','red-hair-gajra',
    'red-hair-jhoomar','red-hair-clip','rose-clip','rubber-hair-gajra',
    'sunflower-hair-clip','yellow-hair-jhoomar','blue-hair-clip',
    'pink-hair-gajra','yellow-hair-clip',
    'handy-bags','lily-bag','pink-white-flower-bag','rose-petal-bag',
    'rose-bag','sunflower-petal-bag','sunflower-design-bag','white-flower-bag',
    'classic-teddy-bear','sunflower-bouquet',
    'ball-key-chain','heart-key-chain','virat-kohli-key-chain',
    'turtle-key-chain','yellow-key-chain'
  )
);

-- Hair Accessories media
INSERT INTO public.product_media (product_id, file_path, alt_text, sort_order, is_primary) VALUES

-- Flower Hair Clip (3 images)
((SELECT id FROM public.products WHERE slug='flower-hair-clip'),
 '/images/products/Hair accesories/Flower hair clip/handbag_19_2.jpg', 'Flower Hair Clip - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='flower-hair-clip'),
 '/images/products/Hair accesories/Flower hair clip/handbag_19_3.jpg', 'Flower Hair Clip - Image 2', 1, false),
((SELECT id FROM public.products WHERE slug='flower-hair-clip'),
 '/images/products/Hair accesories/Flower hair clip/handbag_19_4.jpg', 'Flower Hair Clip - Image 3', 2, false),

-- Hair Band (3 images)
((SELECT id FROM public.products WHERE slug='hair-band'),
 '/images/products/Hair accesories/Hair Band/hair_accessory_1_1.webp', 'Hair Band - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='hair-band'),
 '/images/products/Hair accesories/Hair Band/hair_accessory_1_2.webp', 'Hair Band - Image 2', 1, false),
((SELECT id FROM public.products WHERE slug='hair-band'),
 '/images/products/Hair accesories/Hair Band/home_accessory_1_3.webp', 'Hair Band - Image 3', 2, false),

-- Pink Hair Jhoomar (5 images)
((SELECT id FROM public.products WHERE slug='pink-hair-jhoomar'),
 '/images/products/Hair accesories/Pink Hair Jhoomar/handbag_17_1.jpg', 'Pink Hair Jhoomar - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='pink-hair-jhoomar'),
 '/images/products/Hair accesories/Pink Hair Jhoomar/handbag_20_1.jpg', 'Pink Hair Jhoomar - Image 2', 1, false),
((SELECT id FROM public.products WHERE slug='pink-hair-jhoomar'),
 '/images/products/Hair accesories/Pink Hair Jhoomar/handbag_20_2.jpg', 'Pink Hair Jhoomar - Image 3', 2, false),
((SELECT id FROM public.products WHERE slug='pink-hair-jhoomar'),
 '/images/products/Hair accesories/Pink Hair Jhoomar/handbag_20_3.jpg', 'Pink Hair Jhoomar - Image 4', 3, false),
((SELECT id FROM public.products WHERE slug='pink-hair-jhoomar'),
 '/images/products/Hair accesories/Pink Hair Jhoomar/handbag_20_4.jpg', 'Pink Hair Jhoomar - Image 5', 4, false),

-- Red Hair Gajra (4 images)
((SELECT id FROM public.products WHERE slug='red-hair-gajra'),
 '/images/products/Hair accesories/Red Hair Gajra/handbag_18_2.jpg', 'Red Hair Gajra - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='red-hair-gajra'),
 '/images/products/Hair accesories/Red Hair Gajra/handbag_18_3.jpg', 'Red Hair Gajra - Image 2', 1, false),
((SELECT id FROM public.products WHERE slug='red-hair-gajra'),
 '/images/products/Hair accesories/Red Hair Gajra/handbag_18_4.jpg', 'Red Hair Gajra - Image 3', 2, false),
((SELECT id FROM public.products WHERE slug='red-hair-gajra'),
 '/images/products/Hair accesories/Red Hair Gajra/handbag_19_1.jpg', 'Red Hair Gajra - Image 4', 3, false),

-- Red Hair Jhoomar (3 images)
((SELECT id FROM public.products WHERE slug='red-hair-jhoomar'),
 '/images/products/Hair accesories/Red Hair Jhoomar/handbag_21_1.jpg', 'Red Hair Jhoomar - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='red-hair-jhoomar'),
 '/images/products/Hair accesories/Red Hair Jhoomar/handbag_21_2.jpg', 'Red Hair Jhoomar - Image 2', 1, false),
((SELECT id FROM public.products WHERE slug='red-hair-jhoomar'),
 '/images/products/Hair accesories/Red Hair Jhoomar/handbag_21_3.jpg', 'Red Hair Jhoomar - Image 3', 2, false),

-- Red Hair Clip (2 images)
((SELECT id FROM public.products WHERE slug='red-hair-clip'),
 '/images/products/Hair accesories/Red hair Clip/handbag_15_1.jpg', 'Red Hair Clip - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='red-hair-clip'),
 '/images/products/Hair accesories/Red hair Clip/handbag_15_2.jpg', 'Red Hair Clip - Image 2', 1, false),

-- Rose Clip (3 images)
((SELECT id FROM public.products WHERE slug='rose-clip'),
 '/images/products/Hair accesories/Rose clip/handbag_13_1.jpg', 'Rose Clip - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='rose-clip'),
 '/images/products/Hair accesories/Rose clip/handbag_13_2.jpg', 'Rose Clip - Image 2', 1, false),
((SELECT id FROM public.products WHERE slug='rose-clip'),
 '/images/products/Hair accesories/Rose clip/handbag_13_3.jpg', 'Rose Clip - Image 3', 2, false),

-- Rubber Hair Gajra (5 images)
((SELECT id FROM public.products WHERE slug='rubber-hair-gajra'),
 '/images/products/Hair accesories/Rubber hair Gajra/handbag_23_2.jpg', 'Rubber Hair Gajra - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='rubber-hair-gajra'),
 '/images/products/Hair accesories/Rubber hair Gajra/handbag_23_3.jpg', 'Rubber Hair Gajra - Image 2', 1, false),
((SELECT id FROM public.products WHERE slug='rubber-hair-gajra'),
 '/images/products/Hair accesories/Rubber hair Gajra/handbag_23_4.jpg', 'Rubber Hair Gajra - Image 3', 2, false),
((SELECT id FROM public.products WHERE slug='rubber-hair-gajra'),
 '/images/products/Hair accesories/Rubber hair Gajra/handbag_24_1.jpg', 'Rubber Hair Gajra - Image 4', 3, false),
((SELECT id FROM public.products WHERE slug='rubber-hair-gajra'),
 '/images/products/Hair accesories/Rubber hair Gajra/handbag_24_2.jpg', 'Rubber Hair Gajra - Image 5', 4, false),

-- Sunflower Hair Clip (4 images)
((SELECT id FROM public.products WHERE slug='sunflower-hair-clip'),
 '/images/products/Hair accesories/Sunflower Hair clip/handbag_13_4.jpg', 'Sunflower Hair Clip - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='sunflower-hair-clip'),
 '/images/products/Hair accesories/Sunflower Hair clip/handbag_14_1.jpg', 'Sunflower Hair Clip - Image 2', 1, false),
((SELECT id FROM public.products WHERE slug='sunflower-hair-clip'),
 '/images/products/Hair accesories/Sunflower Hair clip/handbag_14_2.jpg', 'Sunflower Hair Clip - Image 3', 2, false),
((SELECT id FROM public.products WHERE slug='sunflower-hair-clip'),
 '/images/products/Hair accesories/Sunflower Hair clip/handbag_14_3.jpg', 'Sunflower Hair Clip - Image 4', 3, false),

-- Yellow Hair Jhoomar (6 images)
((SELECT id FROM public.products WHERE slug='yellow-hair-jhoomar'),
 '/images/products/Hair accesories/Yellow hair Jhoomar/handbag_21_4.jpg', 'Yellow Hair Jhoomar - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='yellow-hair-jhoomar'),
 '/images/products/Hair accesories/Yellow hair Jhoomar/handbag_22_1.jpg', 'Yellow Hair Jhoomar - Image 2', 1, false),
((SELECT id FROM public.products WHERE slug='yellow-hair-jhoomar'),
 '/images/products/Hair accesories/Yellow hair Jhoomar/handbag_22_2.jpg', 'Yellow Hair Jhoomar - Image 3', 2, false),
((SELECT id FROM public.products WHERE slug='yellow-hair-jhoomar'),
 '/images/products/Hair accesories/Yellow hair Jhoomar/handbag_22_3.jpg', 'Yellow Hair Jhoomar - Image 4', 3, false),
((SELECT id FROM public.products WHERE slug='yellow-hair-jhoomar'),
 '/images/products/Hair accesories/Yellow hair Jhoomar/handbag_22_4.jpg', 'Yellow Hair Jhoomar - Image 5', 4, false),
((SELECT id FROM public.products WHERE slug='yellow-hair-jhoomar'),
 '/images/products/Hair accesories/Yellow hair Jhoomar/handbag_23_1.jpg', 'Yellow Hair Jhoomar - Image 6', 5, false),

-- Blue Hair Clip (3 images)
((SELECT id FROM public.products WHERE slug='blue-hair-clip'),
 '/images/products/Hair accesories/blue Hair clip/handbag_16_2.jpg', 'Blue Hair Clip - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='blue-hair-clip'),
 '/images/products/Hair accesories/blue Hair clip/handbag_16_3.jpg', 'Blue Hair Clip - Image 2', 1, false),
((SELECT id FROM public.products WHERE slug='blue-hair-clip'),
 '/images/products/Hair accesories/blue Hair clip/handbag_16_4.jpg', 'Blue Hair Clip - Image 3', 2, false),

-- Pink Hair Gajra (4 images)
((SELECT id FROM public.products WHERE slug='pink-hair-gajra'),
 '/images/products/Hair accesories/pink hair Gajra/handbag_17_2.jpg', 'Pink Hair Gajra - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='pink-hair-gajra'),
 '/images/products/Hair accesories/pink hair Gajra/handbag_17_3.jpg', 'Pink Hair Gajra - Image 2', 1, false),
((SELECT id FROM public.products WHERE slug='pink-hair-gajra'),
 '/images/products/Hair accesories/pink hair Gajra/handbag_17_4.jpg', 'Pink Hair Gajra - Image 3', 2, false),
((SELECT id FROM public.products WHERE slug='pink-hair-gajra'),
 '/images/products/Hair accesories/pink hair Gajra/handbag_18_1.jpg', 'Pink Hair Gajra - Image 4', 3, false),

-- Yellow Hair Clip (5 images)
((SELECT id FROM public.products WHERE slug='yellow-hair-clip'),
 '/images/products/Hair accesories/yellow hair clip/handbag_15_3.jpg', 'Yellow Hair Clip - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='yellow-hair-clip'),
 '/images/products/Hair accesories/yellow hair clip/handbag_15_4.jpg', 'Yellow Hair Clip - Image 2', 1, false),
((SELECT id FROM public.products WHERE slug='yellow-hair-clip'),
 '/images/products/Hair accesories/yellow hair clip/handbag_16_1.jpg', 'Yellow Hair Clip - Image 3', 2, false),
((SELECT id FROM public.products WHERE slug='yellow-hair-clip'),
 '/images/products/Hair accesories/yellow hair clip/handbag_24_3.jpg', 'Yellow Hair Clip - Image 4', 3, false),
((SELECT id FROM public.products WHERE slug='yellow-hair-clip'),
 '/images/products/Hair accesories/yellow hair clip/handbag_24_4.jpg', 'Yellow Hair Clip - Image 5', 4, false),

-- Hand Bags media
-- Handy Bags (2 images)
((SELECT id FROM public.products WHERE slug='handy-bags'),
 '/images/products/Hand bags/Handy Bags/handbag_25_1.webp', 'Handy Bags - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='handy-bags'),
 '/images/products/Hand bags/Handy Bags/handbag_25_2.webp', 'Handy Bags - Image 2', 1, false),

-- Lily Bag (6 images)
((SELECT id FROM public.products WHERE slug='lily-bag'),
 '/images/products/Hand bags/Lily Bag/handbag_3_3.jpg', 'Lily Bag - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='lily-bag'),
 '/images/products/Hand bags/Lily Bag/handbag_3_4.jpg', 'Lily Bag - Image 2', 1, false),
((SELECT id FROM public.products WHERE slug='lily-bag'),
 '/images/products/Hand bags/Lily Bag/handbag_4_1.jpg', 'Lily Bag - Image 3', 2, false),
((SELECT id FROM public.products WHERE slug='lily-bag'),
 '/images/products/Hand bags/Lily Bag/handbag_4_2.jpg', 'Lily Bag - Image 4', 3, false),
((SELECT id FROM public.products WHERE slug='lily-bag'),
 '/images/products/Hand bags/Lily Bag/handbag_4_3.jpg', 'Lily Bag - Image 5', 4, false),
((SELECT id FROM public.products WHERE slug='lily-bag'),
 '/images/products/Hand bags/Lily Bag/handbag_4_4.jpg', 'Lily Bag - Image 6', 5, false),

-- Pink White Flower Bag (3 images)
((SELECT id FROM public.products WHERE slug='pink-white-flower-bag'),
 '/images/products/Hand bags/Pink white flower bag/handbag_9_1.jpg', 'Pink White Flower Bag - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='pink-white-flower-bag'),
 '/images/products/Hand bags/Pink white flower bag/handbag_9_2.jpg', 'Pink White Flower Bag - Image 2', 1, false),
((SELECT id FROM public.products WHERE slug='pink-white-flower-bag'),
 '/images/products/Hand bags/Pink white flower bag/handbag_9_3.jpg', 'Pink White Flower Bag - Image 3', 2, false),

-- Rose Petal Bag (6 images)
((SELECT id FROM public.products WHERE slug='rose-petal-bag'),
 '/images/products/Hand bags/Rose Petal Bag/handbag_10_3.jpg', 'Rose Petal Bag - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='rose-petal-bag'),
 '/images/products/Hand bags/Rose Petal Bag/handbag_10_4.jpg', 'Rose Petal Bag - Image 2', 1, false),
((SELECT id FROM public.products WHERE slug='rose-petal-bag'),
 '/images/products/Hand bags/Rose Petal Bag/handbag_11_1.jpg', 'Rose Petal Bag - Image 3', 2, false),
((SELECT id FROM public.products WHERE slug='rose-petal-bag'),
 '/images/products/Hand bags/Rose Petal Bag/handbag_11_2.jpg', 'Rose Petal Bag - Image 4', 3, false),
((SELECT id FROM public.products WHERE slug='rose-petal-bag'),
 '/images/products/Hand bags/Rose Petal Bag/handbag_11_3.jpg', 'Rose Petal Bag - Image 5', 4, false),
((SELECT id FROM public.products WHERE slug='rose-petal-bag'),
 '/images/products/Hand bags/Rose Petal Bag/handbag_11_4.jpg', 'Rose Petal Bag - Image 6', 5, false),

-- Rose Bag (5 images)
((SELECT id FROM public.products WHERE slug='rose-bag'),
 '/images/products/Hand bags/Rose bag/handbag_7_1.jpg', 'Rose Bag - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='rose-bag'),
 '/images/products/Hand bags/Rose bag/handbag_7_2.jpg', 'Rose Bag - Image 2', 1, false),
((SELECT id FROM public.products WHERE slug='rose-bag'),
 '/images/products/Hand bags/Rose bag/handbag_7_3.jpg', 'Rose Bag - Image 3', 2, false),
((SELECT id FROM public.products WHERE slug='rose-bag'),
 '/images/products/Hand bags/Rose bag/handbag_7_4.jpg', 'Rose Bag - Image 4', 3, false),
((SELECT id FROM public.products WHERE slug='rose-bag'),
 '/images/products/Hand bags/Rose bag/handbag_8_1.jpg', 'Rose Bag - Image 5', 4, false),

-- Sunflower Petal Bag (3 images)
((SELECT id FROM public.products WHERE slug='sunflower-petal-bag'),
 '/images/products/Hand bags/Sunflower Petal Bag/handbag_8_2.jpg', 'Sunflower Petal Bag - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='sunflower-petal-bag'),
 '/images/products/Hand bags/Sunflower Petal Bag/handbag_8_3.jpg', 'Sunflower Petal Bag - Image 2', 1, false),
((SELECT id FROM public.products WHERE slug='sunflower-petal-bag'),
 '/images/products/Hand bags/Sunflower Petal Bag/handbag_8_4.jpg', 'Sunflower Petal Bag - Image 3', 2, false),

-- Sunflower Design Bag (6 images)
((SELECT id FROM public.products WHERE slug='sunflower-design-bag'),
 '/images/products/Hand bags/Sunflower design bag/handbag_5_1.jpg', 'Sunflower Design Bag - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='sunflower-design-bag'),
 '/images/products/Hand bags/Sunflower design bag/handbag_5_2.jpg', 'Sunflower Design Bag - Image 2', 1, false),
((SELECT id FROM public.products WHERE slug='sunflower-design-bag'),
 '/images/products/Hand bags/Sunflower design bag/handbag_5_3.jpg', 'Sunflower Design Bag - Image 3', 2, false),
((SELECT id FROM public.products WHERE slug='sunflower-design-bag'),
 '/images/products/Hand bags/Sunflower design bag/handbag_5_4.jpg', 'Sunflower Design Bag - Image 4', 3, false),
((SELECT id FROM public.products WHERE slug='sunflower-design-bag'),
 '/images/products/Hand bags/Sunflower design bag/handbag_6_1.jpg', 'Sunflower Design Bag - Image 5', 4, false),
((SELECT id FROM public.products WHERE slug='sunflower-design-bag'),
 '/images/products/Hand bags/Sunflower design bag/handbag_6_2.jpg', 'Sunflower Design Bag - Image 6', 5, false),

-- White Flower Bag (2 images)
((SELECT id FROM public.products WHERE slug='white-flower-bag'),
 '/images/products/Hand bags/white flower bag/handbag_6_3.jpg', 'White Flower Bag - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='white-flower-bag'),
 '/images/products/Hand bags/white flower bag/handbag_6_4.jpg', 'White Flower Bag - Image 2', 1, false),

-- Teddy media
-- Classic Teddy Bear (2 images)
((SELECT id FROM public.products WHERE slug='classic-teddy-bear'),
 '/images/products/Teddy/teddy_1_1.webp', 'Classic Teddy Bear - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='classic-teddy-bear'),
 '/images/products/Teddy/teddy_1_2.webp', 'Classic Teddy Bear - Image 2', 1, false),

-- Bouquet media
-- Sunflower Bouquet (2 images)
((SELECT id FROM public.products WHERE slug='sunflower-bouquet'),
 '/images/products/bouquet/Sunflower_bouquet.jpg', 'Sunflower Bouquet - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='sunflower-bouquet'),
 '/images/products/bouquet/handbag_1_2.jpg', 'Sunflower Bouquet - Image 2', 1, false),

-- Key Chains media
-- Ball Key Chain (3 images)
((SELECT id FROM public.products WHERE slug='ball-key-chain'),
 '/images/products/key chain/Ball key chain/handbag_10_1.jpg', 'Ball Key Chain - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='ball-key-chain'),
 '/images/products/key chain/Ball key chain/handbag_10_2.jpg', 'Ball Key Chain - Image 2', 1, false),
((SELECT id FROM public.products WHERE slug='ball-key-chain'),
 '/images/products/key chain/Ball key chain/handbag_9_4.jpg', 'Ball Key Chain - Image 3', 2, false),

-- Heart Key Chain (2 images)
((SELECT id FROM public.products WHERE slug='heart-key-chain'),
 '/images/products/key chain/Heart Key chain/handbag_2_1.jpg', 'Heart Key Chain - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='heart-key-chain'),
 '/images/products/key chain/Heart Key chain/handbag_2_2.jpg', 'Heart Key Chain - Image 2', 1, false),

-- Virat Kohli Key Chain (3 images)
((SELECT id FROM public.products WHERE slug='virat-kohli-key-chain'),
 '/images/products/key chain/Virat kohli key chian/handbag_12_2.jpg', 'Virat Kohli Key Chain - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='virat-kohli-key-chain'),
 '/images/products/key chain/Virat kohli key chian/handbag_12_3.jpg', 'Virat Kohli Key Chain - Image 2', 1, false),
((SELECT id FROM public.products WHERE slug='virat-kohli-key-chain'),
 '/images/products/key chain/Virat kohli key chian/handbag_12_4.jpg', 'Virat Kohli Key Chain - Image 3', 2, false),

-- Turtle Key Chain (4 images)
((SELECT id FROM public.products WHERE slug='turtle-key-chain'),
 '/images/products/key chain/turtle key chain/handbag_2_3.jpg', 'Turtle Key Chain - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='turtle-key-chain'),
 '/images/products/key chain/turtle key chain/handbag_2_4.jpg', 'Turtle Key Chain - Image 2', 1, false),
((SELECT id FROM public.products WHERE slug='turtle-key-chain'),
 '/images/products/key chain/turtle key chain/handbag_3_1.jpg', 'Turtle Key Chain - Image 3', 2, false),
((SELECT id FROM public.products WHERE slug='turtle-key-chain'),
 '/images/products/key chain/turtle key chain/handbag_3_2.jpg', 'Turtle Key Chain - Image 4', 3, false),

-- Yellow Key Chain (2 images)
((SELECT id FROM public.products WHERE slug='yellow-key-chain'),
 '/images/products/key chain/Yellow key chain/handbag_1_3.jpg', 'Yellow Key Chain - Image 1', 0, true),
((SELECT id FROM public.products WHERE slug='yellow-key-chain'),
 '/images/products/key chain/Yellow key chain/handbag_1_4.jpg', 'Yellow Key Chain - Image 2', 1, false);

COMMIT;