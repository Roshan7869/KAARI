/**
 * Test Utilities Index
 *
 * This module exports all mock factories and utilities for testing.
 * Import from this single entry point:
 *
 * @example
 * ```typescript
 * import {
 *   createMockSupabaseClient,
 *   createMockAuthContext,
 *   createMockCartContext,
 *   createMockPaymentSession,
 * } from '@/tests/utils';
 * ```
 */

// Supabase Mocks
export {
  createMockSupabaseClient,
  createMockQueryBuilder,
  createAuthMockClient,
  createCartMockClient,
  createDataMockClient,
  resetSupabaseMock,
  mockSupabaseClient,
  defaultMockUser,
  defaultMockSession,
  defaultMockAdminUser,
  type MockSupabaseClient,
  type MockQueryBuilder,
  type MockUser,
  type MockSession,
} from './supabase-mock';

// Auth Context Mocks
export {
  createMockAuthContext,
  createAdminAuthContext,
  createUserAuthContext,
  createLoggedOutAuthContext,
  createLoadingAuthContext,
  createMockUseAuth,
  createMockAuthProvider,
  mockUseAuthLoggedOut,
  mockUseAuthUser,
  mockUseAuthAdmin,
  mockUseAuthLoading,
  resetAuthMock,
  defaultMockAuthUser,
  defaultMockAuthSession,
  defaultMockAuthAdminUser,
  type MockAuthContextValue,
  type MockAuthOptions,
} from './auth-mock';

// Cart Context Mocks
export {
  createMockCartContext,
  createCartWithItemsContext,
  createEmptyCartContext,
  createLoadingCartContext,
  createErrorCartContext,
  createMockUseCart,
  mockUseCartEmpty,
  mockUseCartLoading,
  mockUseCartError,
  resetCartMock,
  defaultMockCart,
  defaultMockCartItem,
  defaultMockCartItemWithCustomization,
  defaultMockCartCustomization,
  type MockCartContextValue,
  type MockCartOptions,
} from './cart-mock';

// Payment Mocks
export {
  createMockPaymentSession,
  createMockSuccessResult,
  createMockFailureResult,
  mockGenerateDummyPaymentSession,
  mockGetDummyPaymentSession,
  mockProcessPayment,
  mockVerifyDummyWebhookSignature,
  mockCashfreeSDK,
  mockHandleCashfreeCallback,
  mockCreateSecurePaymentSession,
  mockGetSecurePaymentSession,
  mockProcessSecurePayment,
  resetPaymentMocks,
  setupPaymentSuccess,
  setupPaymentFailure,
  setupPaymentPending,
  type MockPaymentSession,
  type MockPaymentResult,
  type MockCashfreeConfig,
} from './payment-mock';