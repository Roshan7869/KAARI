import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/verify-jwt';
import { logger } from '@/lib/logger-server';
import {
  AdminProductCreateSchema,
} from '@/lib/validations/admin.schema';
import type { TablesInsert } from '@/types/database';

type ProductsInsert = TablesInsert<'products'>;

// Define the insert type explicitly to avoid type inference issues with Zod
interface ProductInsertData {
  title: string;
  description?: string;
  base_price: number;
  currency?: string;
  is_active?: boolean;
  product_type?: 'standard' | 'customized';
  allow_customization?: boolean;
  category?: string;
  slug?: string;
  created_at?: string;
  updated_at?: string;
}

// Helper function to bypass strict type checking for Supabase inserts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function insertWithBypass(supabase: any, table: string, data: unknown) {
  return supabase.from(table).insert(data);
}

/**
 * GET /api/admin/products
 * List all products (admin only)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const adminErr = await requireAdmin();
    if (adminErr) return adminErr;

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // Get all products with count
    const { data: products, error, count } = await supabase
      .from('products')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    logger.info('Admin products list', { count });

    return NextResponse.json({
      success: true,
      data: products,
      meta: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to get admin products', { message: err.message });
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to fetch admin products',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/products
 * Create product (admin only)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const adminErr = await requireAdmin();
    if (adminErr) return adminErr;

    const supabase = await createClient();
    const body = await request.json();

    // Validate request body with Zod
    const result = AdminProductCreateSchema.safeParse(body);
    if (!result.success) {
      // Type guard for failed validation
      const validationError = result as unknown as { error: { errors: z.ZodError<z.ZodTypeAny> } };
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationError.error.errors,
        },
        { status: 400 }
      );
    }

    // Type assertion to ensure TypeScript understands the data shape
    const insertData = result.data as unknown as ProductInsertData;
    // Bypass strict type checking - Supabase's generic type inference is too strict with Zod types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: product, error } = await insertWithBypass(supabase, 'products', insertData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    logger.info('Admin product created', { productId: product.id });

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to create admin product', { message: err.message });
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to create product',
      },
      { status: 500 }
    );
  }
}