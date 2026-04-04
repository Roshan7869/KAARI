import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/logout
 * Sign out current user
 */
export async function POST(_request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.error('Logout error', { message: error.message });
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to sign out',
        },
        { status: 500 }
      );
    }

    logger.info('User logged out');

    return NextResponse.json({
      success: true,
      data: { message: 'Successfully signed out' },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to logout', { message: err.message });
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to logout',
      },
      { status: 500 }
    );
  }
}
