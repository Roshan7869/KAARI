/**
 * Unit Tests for lib/notifications.ts
 *
 * Tests for email notification preferences service.
 * Target coverage: 80%
 */
import { describe, it, expect, beforeEach, vi, afterEach, beforeAll, afterAll } from 'vitest';

// ============================================
// Create mocks at top level (before hoisting)
// ============================================

const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = vi.fn();
const mockReturn = vi.fn();

const mockSupabaseChain: any = {
  from: mockFrom,
  select: mockSelect,
  eq: mockEq,
  single: mockSingle,
  update: mockUpdate,
  return: mockReturn,
};

// Setup chain - all methods return the same mock chain
mockFrom.mockReturnValue(mockSupabaseChain);
mockSelect.mockReturnValue(mockSupabaseChain);
mockEq.mockReturnValue(mockSupabaseChain);
mockSingle.mockReturnValue(mockSupabaseChain);
mockUpdate.mockReturnValue(mockSupabaseChain);
mockReturn.mockReturnValue(mockSupabaseChain);

// Mock the logger - create a reference we can use in tests with vi.mocked()
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

// ============================================
// Mocks (must be at top for ES module hoisting)
// ============================================

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}));

// Mock Supabase client - export 'supabase' as a singleton
vi.mock('@/lib/supabase/client', () => ({
  supabase: mockSupabaseChain,
  createClient: vi.fn(),
}));

// ============================================
// Import after all mocks are set up
// ============================================

let notificationsModule: typeof import('@/lib/notifications');
let logger: any;

beforeAll(async () => {
  notificationsModule = await import('@/lib/notifications');
  // Get the mocked logger instance
  const actualModule = await import('@/lib/logger');
  logger = actualModule.logger;
});

// ============================================
// Tests: getDefaultPreferences (synchronous)
// ============================================

describe('getDefaultPreferences', () => {
  it('returns default preferences with correct structure', () => {
    const preferences = notificationsModule.getDefaultPreferences();

    expect(preferences).toEqual({
      emailNotificationsEnabled: true,
      smsNotificationsEnabled: true,
      marketingEmailsEnabled: false,
    });
  });

  it('returns consistent defaults on multiple calls', () => {
    const pref1 = notificationsModule.getDefaultPreferences();
    const pref2 = notificationsModule.getDefaultPreferences();

    expect(pref1).toEqual(pref2);
  });
});

// ============================================
// Tests: getEmailPreferences
// ============================================

describe('getEmailPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches preferences successfully from database', async () => {
    const mockUser = 'user-123';
    const mockData = {
      email_notifications_enabled: true,
      sms_notifications_enabled: true,
      marketing_emails_enabled: false,
    };

    mockSingle.mockResolvedValue({
      data: mockData,
      error: null,
    });

    const result = await notificationsModule.getEmailPreferences(mockUser);

    expect(result).toEqual({
      emailNotificationsEnabled: true,
      smsNotificationsEnabled: true,
      marketingEmailsEnabled: false,
    });
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockSelect).toHaveBeenCalledWith(
      'email_notifications_enabled, sms_notifications_enabled, marketing_emails_enabled'
    );
    expect(mockEq).toHaveBeenCalledWith('id', mockUser);
  });

  it('returns null on database error', async () => {
    const mockUser = 'user-456';

    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed' },
    });

    const result = await notificationsModule.getEmailPreferences(mockUser);

    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalledWith('Failed to fetch email preferences', {
      error: { message: 'Database connection failed' },
      userId: mockUser,
    });
  });

  it('returns default preferences when no profile found', async () => {
    const mockUser = 'user-789';

    mockSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await notificationsModule.getEmailPreferences(mockUser);

    // Implementation returns defaults when no profile, not null
    expect(result).toEqual({
      emailNotificationsEnabled: true,
      smsNotificationsEnabled: true,
      marketingEmailsEnabled: false,
    });
    expect(logger.warn).toHaveBeenCalledWith('No profile found for user', {
      userId: mockUser,
    });
  });

  it('handles exceptions gracefully', async () => {
    const mockUser = 'user-error';

    mockSingle.mockRejectedValue(new Error('Network error'));

    const result = await notificationsModule.getEmailPreferences(mockUser);

    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalledWith('Exception fetching email preferences', {
      error: expect.any(Error),
      userId: mockUser,
    });
  });

  it('uses default values when data fields are undefined', async () => {
    const mockUser = 'user-partial';

    mockSingle.mockResolvedValue({
      data: {
        email_notifications_enabled: undefined,
        sms_notifications_enabled: undefined,
        marketing_emails_enabled: undefined,
      },
      error: null,
    });

    const result = await notificationsModule.getEmailPreferences(mockUser);

    expect(result).toEqual({
      emailNotificationsEnabled: true,
      smsNotificationsEnabled: true,
      marketingEmailsEnabled: false,
    });
  });
});

// ============================================
// Tests: updateEmailPreferences
// ============================================

describe('updateEmailPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates preferences successfully', async () => {
    const mockUser = 'user-update';
    const mockPreferences = {
      emailNotificationsEnabled: false,
      marketingEmailsEnabled: true,
    };

    const mockUpdatedData = {
      email_notifications_enabled: false,
      sms_notifications_enabled: true,
      marketing_emails_enabled: true,
    };

    mockSingle.mockResolvedValue({
      data: mockUpdatedData,
      error: null,
    });

    const result = await notificationsModule.updateEmailPreferences(mockUser, mockPreferences);

    expect(result.success).toBe(true);
    expect(result.preferences).toEqual({
      emailNotificationsEnabled: false,
      smsNotificationsEnabled: true,
      marketingEmailsEnabled: true,
    });
    expect(result.error).toBeUndefined();
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith({
      email_notifications_enabled: false,
      marketing_emails_enabled: true,
    });
  });

  it('handles empty preferences object', async () => {
    const mockUser = 'user-nochange';

    const mockUpdatedData = {
      email_notifications_enabled: true,
      sms_notifications_enabled: true,
      marketing_emails_enabled: false,
    };

    mockSingle.mockResolvedValue({
      data: mockUpdatedData,
      error: null,
    });

    const result = await notificationsModule.updateEmailPreferences(mockUser, {});

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({});
  });

  it('returns error on database update failure', async () => {
    const mockUser = 'user-fail';
    const mockPreferences = {
      emailNotificationsEnabled: false,
    };

    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Update constraint failed' },
    });

    const result = await notificationsModule.updateEmailPreferences(mockUser, mockPreferences);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Update constraint failed');
    expect(logger.error).toHaveBeenCalledWith('Failed to update email preferences', {
      error: { message: 'Update constraint failed' },
      userId: mockUser,
      preferences: mockPreferences,
    });
  });

  it('returns error when no data returned after update', async () => {
    const mockUser = 'user-noresult';
    const mockPreferences = {
      smsNotificationsEnabled: false,
    };

    mockSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await notificationsModule.updateEmailPreferences(mockUser, mockPreferences);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to update preferences');
    expect(logger.error).toHaveBeenCalledWith('No profile data returned after update', {
      userId: mockUser,
    });
  });

  it('handles exceptions gracefully', async () => {
    const mockUser = 'user-exception';
    const mockPreferences = {
      emailNotificationsEnabled: true,
    };

    mockSingle.mockRejectedValue(new Error('Transaction failed'));

    const result = await notificationsModule.updateEmailPreferences(mockUser, mockPreferences);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Transaction failed');
    expect(logger.error).toHaveBeenCalledWith('Exception updating email preferences', {
      error: 'Transaction failed',
      userId: mockUser,
    });
  });

  it('builds correct update object from partial preferences', async () => {
    const mockUser = 'user-partial-update';

    const mockUpdatedData = {
      email_notifications_enabled: true,
      sms_notifications_enabled: false,
      marketing_emails_enabled: true,
    };

    mockSingle.mockResolvedValue({
      data: mockUpdatedData,
      error: null,
    });

    const result = await notificationsModule.updateEmailPreferences(mockUser, {
      smsNotificationsEnabled: false,
      marketingEmailsEnabled: true,
    });

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      sms_notifications_enabled: false,
      marketing_emails_enabled: true,
    });
  });
});

// ============================================
// Tests: optOutAllEmails
// ============================================

describe('optOutAllEmails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opts out of all email notifications', async () => {
    const mockUser = 'user-optout';

    const mockUpdatedData = {
      email_notifications_enabled: false,
      sms_notifications_enabled: true,
      marketing_emails_enabled: false,
    };

    mockSingle.mockResolvedValue({
      data: mockUpdatedData,
      error: null,
    });

    const result = await notificationsModule.optOutAllEmails(mockUser);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(mockUpdate).toHaveBeenCalledWith({
      email_notifications_enabled: false,
      marketing_emails_enabled: false,
    });
  });

  it('handles opt-out error', async () => {
    const mockUser = 'user-optout-fail';

    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Opt-out failed' },
    });

    const result = await notificationsModule.optOutAllEmails(mockUser);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Opt-out failed');
  });
});

// ============================================
// Tests: optInAllEmails
// ============================================

describe('optInAllEmails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opts in to all email notifications (marketing stays false)', async () => {
    const mockUser = 'user-optin';

    const mockUpdatedData = {
      email_notifications_enabled: true,
      sms_notifications_enabled: true,
      marketing_emails_enabled: false,
    };

    mockSingle.mockResolvedValue({
      data: mockUpdatedData,
      error: null,
    });

    const result = await notificationsModule.optInAllEmails(mockUser);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(mockUpdate).toHaveBeenCalledWith({
      email_notifications_enabled: true,
      marketing_emails_enabled: false,
    });
  });

  it('handles opt-in error', async () => {
    const mockUser = 'user-optin-fail';

    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Opt-in failed' },
    });

    const result = await notificationsModule.optInAllEmails(mockUser);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Opt-in failed');
  });
});

// ============================================
// Tests: toggleNotificationCategory
// ============================================

describe('toggleNotificationCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enables order confirmation category', async () => {
    const mockUser = 'user-toggle';

    const mockUpdatedData = {
      email_notifications_enabled: true,
      sms_notifications_enabled: true,
      marketing_emails_enabled: false,
    };

    mockSingle.mockResolvedValue({
      data: mockUpdatedData,
      error: null,
    });

    const result = await notificationsModule.toggleNotificationCategory(mockUser, 'order_confirmation', true);

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      email_notifications_enabled: true,
    });
  });

  it('disables shipping updates category', async () => {
    const mockUser = 'user-shipping';

    const mockUpdatedData = {
      email_notifications_enabled: false,
      sms_notifications_enabled: true,
      marketing_emails_enabled: false,
    };

    mockSingle.mockResolvedValue({
      data: mockUpdatedData,
      error: null,
    });

    const result = await notificationsModule.toggleNotificationCategory(mockUser, 'shipping_updates', false);

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      email_notifications_enabled: false,
    });
  });

  it('disables payment alerts category', async () => {
    const mockUser = 'user-payment';

    const mockUpdatedData = {
      email_notifications_enabled: false,
      sms_notifications_enabled: true,
      marketing_emails_enabled: false,
    };

    mockSingle.mockResolvedValue({
      data: mockUpdatedData,
      error: null,
    });

    const result = await notificationsModule.toggleNotificationCategory(mockUser, 'payment_alerts', false);

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      email_notifications_enabled: false,
    });
  });

  it('enables marketing emails category', async () => {
    const mockUser = 'user-marketing';

    const mockUpdatedData = {
      email_notifications_enabled: true,
      sms_notifications_enabled: true,
      marketing_emails_enabled: true,
    };

    mockSingle.mockResolvedValue({
      data: mockUpdatedData,
      error: null,
    });

    const result = await notificationsModule.toggleNotificationCategory(mockUser, 'marketing_emails', true);

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      marketing_emails_enabled: true,
    });
  });

  it('disables marketing emails category', async () => {
    const mockUser = 'user-no-marketing';

    const mockUpdatedData = {
      email_notifications_enabled: true,
      sms_notifications_enabled: true,
      marketing_emails_enabled: false,
    };

    mockSingle.mockResolvedValue({
      data: mockUpdatedData,
      error: null,
    });

    const result = await notificationsModule.toggleNotificationCategory(mockUser, 'marketing_emails', false);

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      marketing_emails_enabled: false,
    });
  });

  it('handles toggle error', async () => {
    const mockUser = 'user-toggle-fail';

    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Toggle failed' },
    });

    const result = await notificationsModule.toggleNotificationCategory(mockUser, 'order_confirmation', true);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Toggle failed');
  });
});

// ============================================
// Tests: Type exports
// ============================================

describe('Type exports', () => {
  it('exports NotificationCategory type', () => {
    // Type check - these should compile without errors
    const orderConfirm: notificationsModule.NotificationCategory = 'order_confirmation';
    const shipping: notificationsModule.NotificationCategory = 'shipping_updates';
    const payment: notificationsModule.NotificationCategory = 'payment_alerts';
    const marketing: notificationsModule.NotificationCategory = 'marketing_emails';

    expect(orderConfirm).toBe('order_confirmation');
    expect(shipping).toBe('shipping_updates');
    expect(payment).toBe('payment_alerts');
    expect(marketing).toBe('marketing_emails');
  });

  it('exports EmailPreferences interface', () => {
    // Type check
    const preferences: notificationsModule.EmailPreferences = {
      emailNotificationsEnabled: true,
      smsNotificationsEnabled: false,
      marketingEmailsEnabled: true,
    };

    expect(preferences.emailNotificationsEnabled).toBe(true);
    expect(preferences.smsNotificationsEnabled).toBe(false);
    expect(preferences.marketingEmailsEnabled).toBe(true);
  });
});
