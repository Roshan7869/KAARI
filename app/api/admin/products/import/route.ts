import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

// Maximum rows per import
const MAX_ROWS = 500;

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    // Simple CSV parse: handles quoted fields with commas
    const values: string[] = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        values.push(current.trim()); current = '';
      } else {
        current += ch;
      }
    }
    values.push(current.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
}

const RowSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only'),
  base_price: z.coerce.number().min(0),
  category: z.string().max(100).optional().default(''),
  description: z.string().max(5000).optional().default(''),
  product_type: z.enum(['standard', 'customized']).optional().default('standard'),
  is_active: z.coerce.boolean().optional().default(true),
  allow_customization: z.coerce.boolean().optional().default(false),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let csvText: string;
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    if (!file.name.endsWith('.csv')) return NextResponse.json({ error: 'Only CSV files are allowed' }, { status: 400 });
    if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 });
    csvText = await file.text();
  } else {
    return NextResponse.json({ error: 'Expected multipart/form-data with a file field' }, { status: 400 });
  }

  const rows = parseCSV(csvText);
  if (rows.length === 0) return NextResponse.json({ error: 'CSV is empty or has no data rows' }, { status: 400 });
  if (rows.length > MAX_ROWS) return NextResponse.json({ error: `Too many rows (max ${MAX_ROWS})` }, { status: 400 });

  const errors: { row: number; field: string; message: string }[] = [];
  const valid: z.infer<typeof RowSchema>[] = [];

  for (let i = 0; i < rows.length; i++) {
    const parsed = RowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      for (const e of parsed.error.errors) {
        errors.push({ row: i + 2, field: e.path.join('.'), message: e.message });
      }
    } else {
      valid.push(parsed.data);
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: 'Validation errors in CSV', errors }, { status: 422 });
  }

  const supabase = createAdminClient();

  // Check for duplicate slugs in the CSV itself
  const slugsInCSV = valid.map(v => v.slug);
  const duplicatesInFile = slugsInCSV.filter((s, i) => slugsInCSV.indexOf(s) !== i);
  if (duplicatesInFile.length > 0) {
    return NextResponse.json({ error: `Duplicate slugs in CSV: ${Array.from(new Set(duplicatesInFile)).join(', ')}` }, { status: 422 });
  }

  // Check existing slugs in DB
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('products')
    .select('slug')
    .in('slug', slugsInCSV);

  const existingSlugs = new Set((existing || []).map((p: { slug: string }) => p.slug));
  const conflicting = valid.filter(v => existingSlugs.has(v.slug));
  if (conflicting.length > 0) {
    return NextResponse.json({
      error: `Slugs already exist in database: ${conflicting.map(v => v.slug).join(', ')}`,
    }, { status: 409 });
  }

  // Insert all valid products
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error: insertError } = await (supabase as any)
    .from('products')
    .insert(valid.map(v => ({ ...v, currency: 'INR' })))
    .select('id, title, slug');

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    imported: inserted?.length || 0,
    products: inserted,
  }, { status: 201 });
}

/** GET returns the CSV template for download */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const template = `title,slug,base_price,category,description,product_type,is_active,allow_customization
"My Product","my-product",999,"Earrings","Beautiful handmade earrings","standard",true,false`;

  return new NextResponse(template, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="products-import-template.csv"',
    },
  });
}
