#!/usr/bin/env node
/**
 * Upload catalog to Cloudinary + Supabase
 *
 * Reads product data from seed-catalog-data.js, uploads images to Cloudinary,
 * then creates products, variants, and media entries in Supabase.
 *
 * Usage:
 *   node scripts/upload-catalog.js
 *
 * Required env vars (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
 *   NEXT_PUBLIC_CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 *   DRY_RUN=true — log what would be done without actually uploading/inserting
 */

const fs = require('fs');
const path = require('path');
const { products } = require('./seed-catalog-data');

// ── Load env vars ───────────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const DRY_RUN = process.env.DRY_RUN === 'true';

const IMAGES_ROOT = path.join(__dirname, '..', 'public', 'images', 'products');

// ── Validate env ────────────────────────────────────────────────────────
const missing = [];
if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
if (!SUPABASE_SERVICE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
if (!CLOUDINARY_CLOUD_NAME) missing.push('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');
if (!CLOUDINARY_API_KEY) missing.push('NEXT_PUBLIC_CLOUDINARY_API_KEY');
if (!CLOUDINARY_API_SECRET) missing.push('CLOUDINARY_API_SECRET');

if (missing.length > 0) {
  console.error(`❌ Missing env vars: ${missing.join(', ')}`);
  console.error('   Create .env.local with these vars or set them in your environment.');
  process.exit(1);
}

// ── Cloudinary upload (signed, server-side) ────────────────────────────
const crypto = require('crypto');

async function uploadToCloudinary(filePath, publicId) {
  const fileBuffer = fs.readFileSync(filePath);
  const timestamp = Math.round(Date.now() / 1000);

  const signatureStr = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
  const signature = crypto.createHash('sha1').update(signatureStr).digest('hex');

  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer]), path.basename(filePath));
  formData.append('api_key', CLOUDINARY_API_KEY);
  formData.append('timestamp', timestamp.toString());
  formData.append('public_id', publicId);
  formData.append('signature', signature);

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const res = await fetch(url, { method: 'POST', body: formData });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Cloudinary upload failed: ${err.error?.message || JSON.stringify(err)}`);
  }

  return res.json(); // { public_id, secure_url, width, height, ... }
}

// ── Supabase helpers ────────────────────────────────────────────────────
async function supabaseRequest(table, method, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Prefer: method === 'POST' ? 'return=representation' : undefined,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Supabase ${method} ${table} failed: ${JSON.stringify(err)}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function upsertProduct(product) {
  // Try to find existing product by slug
  const lookupUrl = `${SUPABASE_URL}/rest/v1/products?slug=eq.${product.slug}&select=id`;
  const lookupRes = await fetch(lookupUrl, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  const existing = await lookupRes.json();

  if (existing && existing.length > 0) {
    // Update existing product
    const id = existing[0].id;
    await supabaseRequest(`products?id=eq.${id}`, 'PATCH', {
      title: product.title,
      description: product.description,
      base_price: product.base_price,
      category: product.category,
      is_active: true,
      product_type: 'standard',
      updated_at: new Date().toISOString(),
    });
    console.log(`  ✏️  Updated product: ${product.title} (${id})`);
    return id;
  }

  // Insert new product
  const result = await supabaseRequest('products', 'POST', {
    title: product.title,
    slug: product.slug,
    description: product.description,
    base_price: product.base_price,
    currency: 'INR',
    category: product.category,
    product_type: 'standard',
    allow_customization: false,
    is_active: true,
  });

  const id = result[0]?.id || result?.id;
  console.log(`  ✅ Created product: ${product.title} (${id})`);
  return id;
}

async function createVariant(productId, product) {
  const sku = `SKU-${product.slug.replace(/-/g, '_').toUpperCase()}-DEFAULT`;

  // Check if variant already exists
  const lookupUrl = `${SUPABASE_URL}/rest/v1/product_variants?product_id=eq.${productId}&select=id`;
  const lookupRes = await fetch(lookupUrl, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  const existing = await lookupRes.json();

  if (existing && existing.length > 0) {
    console.log(`  ⏭️  Variant already exists for ${product.title}`);
    return;
  }

  await supabaseRequest('product_variants', 'POST', {
    product_id: productId,
    sku,
    size: 'Standard',
    color: null,
    material: 'Cotton',
    price: product.base_price,
    stock_qty: 20,
    is_default: true,
  });
  console.log(`  ✅ Created variant for ${product.title}`);
}

async function insertMedia(productId, cloudinaryResults, product) {
  // Delete existing media for this product first
  const deleteUrl = `${SUPABASE_URL}/rest/v1/product_media?product_id=eq.${productId}`;
  await fetch(deleteUrl, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });

  // Insert new media entries
  const mediaEntries = cloudinaryResults.map((result, index) => ({
    product_id: productId,
    file_path: result.public_id,
    alt_text: `${product.title} - Image ${index + 1}`,
    sort_order: index,
  }));

  await supabaseRequest('product_media', 'POST', mediaEntries);
  console.log(`  ✅ Inserted ${mediaEntries.length} media entries for ${product.title}`);
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🧶 Kaari Catalog Upload — ${products.length} products\n`);
  if (DRY_RUN) console.log('⚠️  DRY RUN — no uploads or inserts will happen\n');

  let created = 0;
  let skipped = 0;

  for (const product of products) {
    console.log(`\n📦 Processing: ${product.title}`);

    // 1. Upload images to Cloudinary
    const cloudinaryResults = [];
    for (let i = 0; i < product.images.length; i++) {
      const fileName = product.images[i];
      const localPath = path.join(IMAGES_ROOT, product.folder, fileName);

      if (!fs.existsSync(localPath)) {
        console.error(`  ❌ Image not found: ${localPath}`);
        continue;
      }

      const publicId = `products/${product.slug}/${path.parse(fileName).name}`;

      if (DRY_RUN) {
        console.log(`  📸 Would upload: ${fileName} → ${publicId}`);
        cloudinaryResults.push({ public_id: publicId, secure_url: `https://via.placeholder.com/${publicId}` });
      } else {
        try {
          const result = await uploadToCloudinary(localPath, publicId);
          cloudinaryResults.push(result);
          console.log(`  📸 Uploaded: ${fileName} → ${result.public_id}`);
        } catch (err) {
          console.error(`  ❌ Upload failed for ${fileName}: ${err.message}`);
        }
      }
    }

    if (cloudinaryResults.length === 0) {
      console.error(`  ⚠️  No images uploaded for ${product.title}, skipping product creation.`);
      skipped++;
      continue;
    }

    // 2. Create product in Supabase
    if (DRY_RUN) {
      console.log(`  📝 Would create product: ${product.title} (₹${product.base_price})`);
      created++;
      continue;
    }

    try {
      const productId = await upsertProduct(product);
      await createVariant(productId, product);
      await insertMedia(productId, cloudinaryResults, product);
      created++;
    } catch (err) {
      console.error(`  ❌ Product creation failed for ${product.title}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`\n\n📊 Done! Created: ${created}, Skipped: ${skipped}\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});