import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE URL or SERVICE KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const bucketName = 'product-media';

// Define the mapping between filenames and product slugs
const mapping = {
  'crochet-accessory-1.webp': 'boho-scrunchie',
  'crochet-doll-1.webp': 'pastel-bunny-doll',
  'crochet-doll-2.webp': 'teddy-bear-doll',
  'crochet-gajra-1.webp': 'orange-bloom-gajra',
  'crochet-gajra-2.webp': 'bridal-red-gajra',
  'crochet-handbag-1.webp': 'boho-sunburst-handbag',
  'crochet-handbag-2.webp': 'floral-tote-bag',
  'crochet-keychain-1.webp': 'unicorn-keychain',
  'crochet-keychain-2.webp': 'rainbow-flower-keychain',
};

async function createBucketIfMissing() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  
  if (!buckets.some(b => b.name === bucketName)) {
    console.log(`Creating bucket ${bucketName}...`);
    const { error: createError } = await supabase.storage.createBucket(bucketName, { public: true });
    if (createError) throw createError;
  } else {
    // ensure public
    await supabase.storage.updateBucket(bucketName, { public: true });
  }
}

async function uploadAndSeed() {
  try {
    await createBucketIfMissing();

    const { data: products, error: prodErr } = await supabase.from('products').select('id, slug, title');
    if (prodErr) throw prodErr;

    const imgDir = path.join(__dirname, 'public', 'images', 'products');
    const files = fs.readdirSync(imgDir);

    for (const file of files) {
      if (!file.endsWith('.webp')) continue;

      const slug = mapping[file];
      if (!slug) {
        console.warn(`No mapping for ${file}`);
        continue;
      }

      const product = products.find(p => p.slug === slug);
      if (!product) {
        console.warn(`No product found for slug ${slug}`);
        continue;
      }

      const filePath = path.join(imgDir, file);
      const fileBuffer = fs.readFileSync(filePath);

      console.log(`Uploading ${file}...`);
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(bucketName)
        .upload(file, fileBuffer, { contentType: 'image/webp', upsert: true });

      if (uploadErr) {
        console.error(`Failed to upload ${file}:`, uploadErr);
        continue;
      }

      console.log(`Linking ${file} to ${slug}...`);
      
      // Upsert to product_media
      const { error: insertErr } = await supabase
        .from('product_media')
        .upsert({
          product_id: product.id,
          file_path: file,
          alt_text: product.title,
          sort_order: 1
        }, { onConflict: 'product_id,file_path' });

      if (insertErr) {
        console.error(`Failed to insert ${file} into product_media:`, insertErr);
      }
    }

    console.log("Success! Finished seeding images.");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

uploadAndSeed();
