import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const ProductRowSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens'),
  base_price: z.coerce.number().positive(),
  description: z.string().optional().default(''),
  category: z.string().optional().default(''),
  product_type: z.string().optional().default('standard'),
  is_active: z.coerce.boolean().optional().default(true),
  allow_customization: z.coerce.boolean().optional().default(false),
});

type ProductRow = z.infer<typeof ProductRowSchema>;

const BodySchema = z.object({
  products: z.array(z.record(z.string())).min(1).max(500),
});

export async function POST(req: NextRequest) {
  const { sessionClaims } = await auth();
  if ((sessionClaims?.metadata as { role?: string } | undefined)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 422 });
  }

  const validRows: ProductRow[] = [];
  const rowErrors: Array<{ row: number; issues: string[] }> = [];

  for (let i = 0; i < parsed.data.products.length; i++) {
    const result = ProductRowSchema.safeParse(parsed.data.products[i]);
    if (result.success) {
      validRows.push(result.data);
    } else {
      rowErrors.push({
        row: i + 1,
        issues: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
      });
    }
  }

  if (rowErrors.length > 0) {
    return NextResponse.json({ error: 'Validation errors in rows', rowErrors }, { status: 422 });
  }

  const supabase = createAdminClient();

  // Check for duplicate slugs in the batch
  const slugs = validRows.map((r) => r.slug);
  const uniqueSlugs = new Set(slugs);
  if (uniqueSlugs.size !== slugs.length) {
    return NextResponse.json({ error: 'Duplicate slugs in import batch' }, { status: 422 });
  }

  // Check for existing slugs in DB
  const { data: existing } = await supabase
    .from('products')
    .select('slug')
    .in('slug', slugs);

  if (existing && existing.length > 0) {
    const existingSlugs = existing.map((r: { slug: string }) => r.slug);
    return NextResponse.json({
      error: 'Some slugs already exist in database',
      duplicates: existingSlugs,
    }, { status: 409 });
  }

  const inserts = validRows.map((row) => ({
    title: row.title,
    slug: row.slug,
    base_price: row.base_price,
    description: row.description,
    category: row.category,
    product_type: row.product_type,
    is_active: row.is_active,
    allow_customization: row.allow_customization,
  }));

  const { data: inserted, error } = await supabase
    .from('products')
    .insert(inserts)
    .select('id, title, slug');

  if (error) {
    logger.error('Bulk import error:', { error });
    return NextResponse.json({ error: 'Database insert failed', details: error.message }, { status: 500 });
  }

  return NextResponse.json({
    imported: inserted?.length ?? 0,
    products: inserted ?? [],
  });
}
