import { z, ZodSchema } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Validates a request body against a Zod schema.
 * Returns { data } on success or { error: NextResponse } on failure.
 * Usage:
 *   const result = await validateBody(req, mySchema)
 *   if ('error' in result) return result.error
 *   const { data } = result
 */
export async function validateBody<T>(
  req: NextRequest | Request,
  schema: ZodSchema<T>
): Promise<{ data: T } | { error: NextResponse }> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return {
      error: NextResponse.json(
        { error: 'Invalid JSON body', code: 'PARSE_ERROR' },
        { status: 400 }
      ),
    }
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    return {
      error: NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }  // Use 400 to match existing API convention
      ),
    }
  }
  return { data: result.data }
}

/**
 * Validates query params against a Zod schema.
 */
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
): { data: T } | { error: NextResponse } {
  const params = Object.fromEntries(searchParams.entries())
  const result = schema.safeParse(params)
  if (!result.success) {
    return {
      error: NextResponse.json(
        {
          error: 'Invalid query parameters',
          code: 'QUERY_VALIDATION_ERROR',
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      ),
    }
  }
  return { data: result.data }
}

// ---- Reusable common schemas ----

export const paginationSchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const uuidSchema = z.string().uuid('Must be a valid UUID')

export const idParamSchema = z.object({ id: uuidSchema })
