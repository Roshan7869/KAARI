/**
 * Wrapper around fetch() that adds timeout functionality
 *
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param timeoutMs - Timeout in milliseconds (default: 10000ms = 10s)
 * @returns Promise that resolves to the fetch response or rejects on timeout/error
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 10000
): Promise<Response> {
  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  // Race between fetch and timeout
  try {
    const response = await Promise.race([
      fetch(url, options),
      timeoutPromise
    ]);
    return response as Response;
  } catch (error) {
    // Re-throw timeout or fetch errors
    throw error;
  }
}

/**
 * Wrapper around fetch() with timeout and retry logic for transient failures
 *
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param maxRetries - Maximum number of retries for network errors (default: 2)
 * @param timeoutMs - Timeout in milliseconds (default: 10000ms = 10s)
 * @param baseDelayMs - Base delay between retries in milliseconds (default: 1000ms)
 * @returns Promise that resolves to the fetch response or rejects on timeout/error
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 2,
  timeoutMs: number = 10000,
  baseDelayMs: number = 1000
): Promise<Response> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);
      return response;
    } catch (error) {
      lastError = error as Error;

      // If this was the last attempt, re-throw the error
      if (attempt === maxRetries + 1) {
        throw lastError;
      }

      // Only retry on network-type errors (timeout or network issues)
      // Don't retry on HTTP error responses (4xx, 5xx) as those are usually not transient
      const errorMessage = lastError.message.toLowerCase();
      if (
        errorMessage.includes('timeout') ||
        errorMessage.includes('network') ||
        errorMessage.includes('fetch') ||
        (lastError as { type?: string }).type === 'request-timeout'
      ) {
        // Exponential backoff: wait baseDelayMs * 2^(attempt-1)
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // For non-network errors, don't retry
      throw error;
    }
  }

  // This shouldn't be reached due to the loop logic, but just in case
  throw lastError!;
}