import { vi } from 'vitest';

/**
 * Create a mock NextRequest for API route testing.
 */
export function createMockRequest(options: {
  method?: string;
  url?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
} = {}): Request {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    body,
    headers = {},
    cookies = {},
  } = options;

  const init: RequestInit = {
    method,
    headers: new Headers(headers),
  };

  if (body && method !== 'GET') {
    init.body = JSON.stringify(body);
    (init.headers as Headers).set('content-type', 'application/json');
  }

  const request = new Request(url, init);

  // Mock cookies
  Object.defineProperty(request, 'cookies', {
    value: {
      get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
      getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })),
    },
    writable: true,
  });

  return request;
}

/**
 * Create a mock Supabase client that returns predictable data.
 */
export function createMockSupabaseClient(returnData: Record<string, unknown> | null = null, error: Error | null = null) {
  const mockSingle = vi.fn().mockResolvedValue({ data: returnData, error });
  const mockMaybeSingle = vi.fn().mockResolvedValue({ data: returnData, error });
  const mockSelect = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockIs = vi.fn().mockReturnThis();
  const mockOrder = vi.fn().mockReturnThis();
  const mockRange = vi.fn().mockResolvedValue({ data: returnData, error });
  const mockInsert = vi.fn().mockReturnThis();
  const mockUpdate = vi.fn().mockReturnThis();
  const mockDelete = vi.fn().mockReturnThis();
  const mockRpc = vi.fn().mockResolvedValue({ data: returnData, error });

  const mockFrom = vi.fn().mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    is: mockIs,
    order: mockOrder,
    range: mockRange,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    rpc: mockRpc,
  });

  // Allow chaining by making eq/etc return the same object
  mockEq.mockReturnValue({
    select: mockSelect,
    eq: mockEq,
    is: mockIs,
    order: mockOrder,
    range: mockRange,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
  });

  mockSelect.mockReturnValue({
    eq: mockEq,
    is: mockIs,
    order: mockOrder,
    range: mockRange,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
  });

  return {
    from: mockFrom,
    rpc: mockRpc,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  };
}

/**
 * Parse JSON from a NextResponse.
 */
export async function parseResponse(response: Response): Promise<unknown> {
  return response.json();
}

/**
 * Get response status code.
 */
export function getStatus(response: Response): number {
  return response.status;
}
