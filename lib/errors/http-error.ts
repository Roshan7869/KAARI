/**
 * HTTP Error Class
 * Custom error with status code, message, and optional details
 */

export class HttpError extends Error {
  public readonly status: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    status: number,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.status = status;
    this.details = details;
    this.name = 'HttpError';
  }
}

/**
 * Create an HttpError with status 400 (Bad Request)
 */
export function badRequest(message: string, details?: Record<string, unknown>): HttpError {
  return new HttpError(400, message, details);
}

/**
 * Create an HttpError with status 401 (Unauthorized)
 */
export function unauthorized(message: string = 'Unauthorized'): HttpError {
  return new HttpError(401, message);
}

/**
 * Create an HttpError with status 403 (Forbidden)
 */
export function forbidden(message: string = 'Forbidden'): HttpError {
  return new HttpError(403, message);
}

/**
 * Create an HttpError with status 404 (Not Found)
 */
export function notFound(message: string = 'Not found'): HttpError {
  return new HttpError(404, message);
}

/**
 * Create an HttpError with status 409 (Conflict)
 */
export function conflict(message: string, details?: Record<string, unknown>): HttpError {
  return new HttpError(409, message, details);
}

/**
 * Create an HttpError with status 429 (Too Many Requests)
 */
export function tooManyRequests(message: string = 'Too many requests'): HttpError {
  return new HttpError(429, message);
}

/**
 * Create an HttpError with status 500 (Internal Server Error)
 */
export function internalError(message: string = 'Internal server error'): HttpError {
  return new HttpError(500, message);
}
