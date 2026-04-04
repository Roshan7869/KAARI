/**
 * Vitest Test Setup
 *
 * This file sets up the testing environment with:
 * - @testing-library/jest-dom matchers for DOM assertions
 * - Global mocks for browser APIs (matchMedia, IntersectionObserver, ResizeObserver)
 * - Cleanup after each test
 */

// Import vitest first to ensure expect is available globally
import { vi, afterEach, expect } from 'vitest';

// Extend expect with jest-dom matchers after vitest has initialized expect
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

// ============================================
// Mock matchMedia for responsive tests
// ============================================
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ============================================
// Mock IntersectionObserver for scroll/infinite load tests
// ============================================
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  root = null;
  rootMargin = '';
  thresholds = [];

  constructor(callback: IntersectionObserverCallback) {
    // Store callback for manual triggering in tests
    this._callback = callback;
  }

  _callback: IntersectionObserverCallback;

  // Helper method for tests to trigger intersection
  _triggerIntersection(entries: Partial<IntersectionObserverEntry>[]) {
    const fullEntries = entries.map(entry => ({
      boundingClientRect: entry.boundingClientRect || {} as DOMRectReadOnly,
      intersectionRatio: entry.intersectionRatio ?? 0,
      intersectionRect: entry.intersectionRect || {} as DOMRectReadOnly,
      isIntersecting: entry.isIntersecting ?? false,
      rootBounds: entry.rootBounds || null,
      target: entry.target || document.createElement('div'),
      time: entry.time ?? Date.now(),
    }));
    this._callback(fullEntries as IntersectionObserverEntry[], this as unknown as IntersectionObserver);
  }
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// ============================================
// Mock ResizeObserver for layout tests
// ============================================
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(callback: ResizeObserverCallback) {
    this._callback = callback;
  }

  _callback: ResizeObserverCallback;

  // Helper method for tests to trigger resize
  _triggerResize(entries: Partial<ResizeObserverEntry>[]) {
    const fullEntries = entries.map(entry => ({
      borderBoxSize: entry.borderBoxSize || [] as unknown as ResizeObserverSize[],
      contentBoxSize: entry.contentBoxSize || [] as unknown as ResizeObserverSize[],
      contentRect: entry.contentRect || {} as DOMRectReadOnly,
      devicePixelContentBoxSize: entry.devicePixelContentBoxSize || [] as unknown as ResizeObserverSize[],
      target: entry.target || document.createElement('div'),
    }));
    this._callback(fullEntries as ResizeObserverEntry[], this);
  }
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});

// ============================================
// Mock scrollTo for scroll behavior tests
// ============================================
window.scrollTo = vi.fn();

// ============================================
// Mock sessionStorage and localStorage
// ============================================
const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
};

Object.defineProperty(window, 'sessionStorage', {
  value: createStorageMock(),
});

Object.defineProperty(window, 'localStorage', {
  value: createStorageMock(),
});

// ============================================
// Mock fetch for API tests
// ============================================
global.fetch = vi.fn();

// ============================================
// Mock crypto.randomUUID for payment session tests
// ============================================
let uuidCounter = 0;
Object.defineProperty(crypto, 'randomUUID', {
  value: vi.fn(() => {
    uuidCounter++;
    return `test-uuid-${uuidCounter.toString().padStart(8, '0')}`;
  }),
});

// ============================================
// Mock crypto.getRandomValues
// ============================================
Object.defineProperty(crypto, 'getRandomValues', {
  value: vi.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
});

// ============================================
// Console suppression for cleaner test output
// ============================================
// Keep error and warn, suppress info/debug in tests
vi.spyOn(console, 'info').mockImplementation(() => {});
vi.spyOn(console, 'debug').mockImplementation(() => {});

// ============================================
// Cleanup after each test
// ============================================
afterEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();

  // Reset storage mocks (only if available)
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.clear();
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
});

// ============================================
// Export mocks for use in test files
// ============================================
export { MockIntersectionObserver, MockResizeObserver };