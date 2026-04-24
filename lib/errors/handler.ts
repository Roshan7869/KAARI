import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { HttpError } from './http-error';
import { logger } from '@/lib/logger-server';

/**
 * Error handling wrapper for API routes
 * Catches and formats errors consistently
 */
export function withErrorHandler<T extends (...args: unknown[]) => Promise<NextResponse>>(
  fn: T
): T {
  return (async (...args: Parameters<T>): Promise<NextResponse> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof HttpError) {
        logger.error(`HTTP Error [${error.status}]: ${error.message}`, error.details);
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            details: error.details,
          },
          { status: error.status }
        );
      }

      if (error instanceof ZodError) {
        logger.warn('Validation error', { errors: error.errors });
        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            details: error.errors,
          },
          { status: 400 }
        );
      }

      // Unknown error - log and return generic 500
      const err = error as Error;
      logger.error('Unexpected error', {
        message: err.message,
        stack: err.stack,
        name: err.name,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
        },
        { status: 500 }
      );
    }
  }) as T;
}
