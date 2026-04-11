import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LoginSchema } from '@/lib/validations/auth.schema';
import { logger } from '@/lib/logger';
import { applyRateLimit } from '@/lib/server-rate-limit';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

// Helper function to bypass strict type checking for Supabase inserts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function insertWithBypass(supabase: any, table: string, data: unknown) {
  return supabase.from(table).insert(data);
}

// Helper function to bypass strict type checking for Supabase selects
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function selectWithBypass(supabase: any, table: string, columns: string) {
  return supabase.from(table).select(columns);
}

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limit: 10 attempts / 15 min per IP (brute-force protection)
  const rateLimitResponse = await applyRateLimit(request, 'auth', false);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const result = LoginSchema.safeParse(body);

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

    const { email, password, rememberMe = false } = result.data;

    // Create Supabase client
    const supabase = await createClient();

    // Sign in with email and password
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      logger.warn('Login failed', { email, error: authError?.message });
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or password',
        },
        { status: 401 }
      );
    }

    // Check if user has a profile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email_notifications_enabled, sms_notifications_enabled, marketing_emails_enabled')
      .eq('id', authData.user.id)
      .single() as unknown as { data: Profile | null; error: Error | null };

    // Create user profile if it doesn't exist
    if (!profile && authData.user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insertData: any = {
        id: authData.user.id,
        full_name: authData.user.user_metadata?.full_name ?? null,
        email_notifications_enabled: true,
        sms_notifications_enabled: true,
        marketing_emails_enabled: false,
      };
      const { error: insertError } = await insertWithBypass(supabase, 'profiles', insertData);

      if (insertError && insertError.code !== '23505') {
        throw insertError;
      }
    }

    logger.info('Login successful', { userId: authData.user.id });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          full_name: profile?.full_name ?? authData.user.user_metadata?.full_name,
          email_notifications_enabled: profile?.email_notifications_enabled ?? true,
          sms_notifications_enabled: profile?.sms_notifications_enabled ?? true,
          marketing_emails_enabled: profile?.marketing_emails_enabled ?? false,
        },
        rememberMe,
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to login', { message: err.message });
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to login',
      },
      { status: 500 }
    );
  }
}
