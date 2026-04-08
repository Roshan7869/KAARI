import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

// Type definition for Supabase error with code property
interface SupabaseError extends Error {
  code?: string;
}

// Helper function to bypass strict type checking for Supabase selects
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function selectWithBypass(supabase: any, table: string, columns: string) {
  return supabase.from(table).select(columns);
}

// Helper function to bypass strict type checking for Supabase updates
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function updateWithBypass(supabase: any, table: string, data: unknown) {
  return supabase.from(table).update(data);
}

/**
 * GET /api/auth/me
 * Get current user's profile
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const clerkUser = await currentUser();
    const supabase = createAdminClient();

    // Get user profile from database
    // Bypass strict type checking - Supabase's generic type inference is too strict
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile, error: profileError } = await selectWithBypass(supabase, 'profiles', 'full_name, phone, email_notifications_enabled, sms_notifications_enabled, marketing_emails_enabled')
      .eq('id', userId)
      .single() as unknown as { data: { full_name: string | null; phone: string | null; email_notifications_enabled: boolean | null; sms_notifications_enabled: boolean | null; marketing_emails_enabled: boolean | null } | null; error: SupabaseError | null };

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    logger.debug('Got user profile', { userId });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: userId,
          email: clerkUser?.emailAddresses?.[0]?.emailAddress,
          full_name: profile?.full_name ?? clerkUser?.fullName,
          phone: profile?.phone,
          email_notifications_enabled: profile?.email_notifications_enabled ?? true,
          sms_notifications_enabled: profile?.sms_notifications_enabled ?? true,
          marketing_emails_enabled: profile?.marketing_emails_enabled ?? false,
        },
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to get user profile', { message: err.message });
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to get user profile',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/auth/me
 * Update current user's profile
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();
    const body = await request.json();
    const { full_name, phone, email_notifications_enabled, sms_notifications_enabled, marketing_emails_enabled } = body;

    // Update profile in database using bypass helper
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile, error: profileError } = await updateWithBypass(supabase, 'profiles', {
      full_name,
      phone,
      email_notifications_enabled,
      sms_notifications_enabled,
      marketing_emails_enabled,
      updated_at: new Date().toISOString(),
    } as unknown as Record<string, unknown>)
      .eq('id', userId)
      .select()
      .single() as unknown as { data: { full_name: string | null; phone: string | null; email_notifications_enabled: boolean | null; sms_notifications_enabled: boolean | null; marketing_emails_enabled: boolean | null } | null; error: SupabaseError | null };

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    logger.info('Updated user profile', { userId });

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          full_name: profile?.full_name,
          phone: profile?.phone,
          email_notifications_enabled: profile?.email_notifications_enabled,
          sms_notifications_enabled: profile?.sms_notifications_enabled,
          marketing_emails_enabled: profile?.marketing_emails_enabled,
        },
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to update user profile', { message: err.message });
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to update user profile',
      },
      { status: 500 }
    );
  }
}
