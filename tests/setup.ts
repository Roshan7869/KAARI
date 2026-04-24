import { vi } from 'vitest';

// Mock server-only modules so tests can import server-side code
vi.mock('server-only', () => ({}));

// Mock console methods during tests to reduce noise
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});
