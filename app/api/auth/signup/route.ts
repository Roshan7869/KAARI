import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SignupSchema } from '@/lib/validations/auth.schema';
import { logger } from '@/lib/logger';
import { applyRateLimit } from '@/lib/server-rate-limit';

// Type definition for Supabase error with code property
interface SupabaseError extends Error {
  code?: string;
}

// Helper function to bypass strict type checking for Supabase inserts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function insertWithBypass(supabase: any, table: string, data: unknown) {
  return supabase.from(table).insert(data);
}

/**
 * POST /api/auth/signup
 * Register new user with email and password
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limit: 10 attempts / 15 min per IP
  const rateLimitResponse = await applyRateLimit(request, 'auth', false);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const result = SignupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: result.error.errors,
        },
        { status: 400 }
      );
    }

    const { email, password, confirmPassword, full_name } = result.data;

    // Validate passwords match
    if (password !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'Passwords do not match',
        },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = await createClient();

    // Sign up with email and password
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.KAARI_BASE_URL?.trim() || 'http://localhost:3000'}/auth/callback`,
      },
    });

    if (authError) {
      logger.warn('Signup failed', { email, error: authError.message });
      return NextResponse.json(
        {
          success: false,
          error: authError.message,
        },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Signup failed - no user returned',
        },
        { status: 500 }
      );
    }

    // Create user profile using bypass helper
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: profileError } = await insertWithBypass(supabase, 'profiles', {
      id: authData.user.id,
      full_name,
      email_notifications_enabled: true,
      sms_notifications_enabled: true,
      marketing_emails_enabled: false,
    } as unknown as Record<string, unknown>);

    if (profileError && profileError.code !== '23505') {
      throw profileError;
    }

    logger.info('Signup successful', { userId: authData.user.id, email });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          full_name,
        },
        // If email confirmed immediately (not always the case)
        emailConfirmed: authData.user.aud !== null,
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to signup', { message: err.message });
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to signup',
      },
      { status: 500 }
    );
  }
}
