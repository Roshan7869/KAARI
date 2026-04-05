import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EmailResetSchema, PasswordResetSchema } from '@/lib/validations/auth.schema';
import { logger } from '@/lib/logger';
import { applyRateLimit } from '@/lib/server-rate-limit';

/**
 * POST /api/auth/password-reset/request
 * Request password reset email
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limit: 10 attempts / 15 min per IP
  const rateLimitResponse = await applyRateLimit(request, 'auth', false);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const supabase = await createClient();
    const body = await request.json();

    // Handle both email and password reset requests
    if (body.type === 'password') {
      // Password reset with token
      const result = PasswordResetSchema.safeParse(body);
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

      const { password, confirmPassword } = result.data;

      if (password !== confirmPassword) {
        return NextResponse.json(
          { success: false, error: 'Passwords do not match' },
          { status: 400 }
        );
      }

      // Update password with token
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        logger.error('Password update error', { message: error.message });
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }

      logger.info('Password updated successfully');

      return NextResponse.json({
        success: true,
        data: { message: 'Password updated successfully' },
      });
    }

    // Email reset request
    const result = EmailResetSchema.safeParse(body);
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

    const { email } = result.data;

    // Request password reset
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.KAARI_BASE_URL?.trim() || 'http://localhost:3000'}/auth/password-reset`,
    });

    if (error) {
      logger.error('Password reset request error', { email, message: error.message });
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    logger.info('Password reset email sent', { email });

    return NextResponse.json({
      success: true,
      data: { message: 'Password reset email sent' },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to process password reset', { message: err.message });
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to process password reset',
      },
      { status: 500 }
    );
  }
}
