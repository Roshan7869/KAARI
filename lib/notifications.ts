/**
 * Email Notification Preferences Service
 *
 * Manages user email notification preferences stored in the profiles table.
 * Users can toggle on/off:
 * - Order confirmations
 * - Shipping updates
 * - Payment alerts
 * - Marketing emails
 */

import { supabase } from './supabase/client';
import { logger } from './logger';

/**
 * Get a Supabase client instance
 * For client-side usage, uses the browser client directly
 */
function getSupabaseClient() {
  return supabase;
}

export type NotificationCategory = 'order_confirmation' | 'shipping_updates' | 'payment_alerts' | 'marketing_emails';

export interface EmailPreferences {
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  marketingEmailsEnabled: boolean;
}

/**
 * Get default notification preferences for new users
 */
export function getDefaultPreferences(): EmailPreferences {
  return {
    emailNotificationsEnabled: true,
    smsNotificationsEnabled: true,
    marketingEmailsEnabled: false,
  };
}

/**
 * Fetch user's email notification preferences from the database
 */
export async function getEmailPreferences(userId: string): Promise<EmailPreferences | null> {
  try {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('email_notifications_enabled, sms_notifications_enabled, marketing_emails_enabled')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('Failed to fetch email preferences', { error, userId });
      return null;
    }

    if (!data) {
      logger.warn('No profile found for user', { userId });
      return getDefaultPreferences();
    }

    return {
      emailNotificationsEnabled: data.email_notifications_enabled ?? true,
      smsNotificationsEnabled: data.sms_notifications_enabled ?? true,
      marketingEmailsEnabled: data.marketing_emails_enabled ?? false,
    };
  } catch (err) {
    logger.error('Exception fetching email preferences', { error: err, userId });
    return null;
  }
}

/**
 * Update user's email notification preferences in the database
 */
export async function updateEmailPreferences(
  userId: string,
  preferences: Partial<EmailPreferences>
): Promise<{ success: boolean; error?: string; preferences?: EmailPreferences }> {
  try {
    const supabase = await getSupabaseClient();

    // Build update object with only provided fields
    const updateData: Record<string, boolean> = {};
    if ('emailNotificationsEnabled' in preferences && preferences.emailNotificationsEnabled !== undefined) {
      updateData.email_notifications_enabled = preferences.emailNotificationsEnabled;
    }
    if ('smsNotificationsEnabled' in preferences && preferences.smsNotificationsEnabled !== undefined) {
      updateData.sms_notifications_enabled = preferences.smsNotificationsEnabled;
    }
    if ('marketingEmailsEnabled' in preferences && preferences.marketingEmailsEnabled !== undefined) {
      updateData.marketing_emails_enabled = preferences.marketingEmailsEnabled;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select('email_notifications_enabled, sms_notifications_enabled, marketing_emails_enabled')
      .single();

    if (error) {
      logger.error('Failed to update email preferences', { error, userId, preferences });
      return { success: false, error: error.message };
    }

    if (!data) {
      logger.error('No profile data returned after update', { userId });
      return { success: false, error: 'Failed to update preferences' };
    }

    const updatedPreferences: EmailPreferences = {
      emailNotificationsEnabled: data.email_notifications_enabled ?? true,
      smsNotificationsEnabled: data.sms_notifications_enabled ?? true,
      marketingEmailsEnabled: data.marketing_emails_enabled ?? false,
    };

    logger.info('Email preferences updated successfully', { userId, preferences: updatedPreferences });

    return { success: true, preferences: updatedPreferences };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception updating email preferences', { error: errorMessage, userId });
    return { success: false, error: errorMessage };
  }
}

/**
 * Opt-out of all email notifications
 */
export async function optOutAllEmails(userId: string): Promise<{ success: boolean; error?: string }> {
  return updateEmailPreferences(userId, {
    emailNotificationsEnabled: false,
    marketingEmailsEnabled: false,
  });
}

/**
 * Opt-in to all email notifications
 */
export async function optInAllEmails(userId: string): Promise<{ success: boolean; error?: string }> {
  return updateEmailPreferences(userId, {
    emailNotificationsEnabled: true,
    marketingEmailsEnabled: false, // Marketing opt-in requires explicit consent
  });
}

/**
 * Toggle a specific notification category
 */
export async function toggleNotificationCategory(
  userId: string,
  category: NotificationCategory,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  const update: Partial<EmailPreferences> = {};

  switch (category) {
    case 'order_confirmation':
    case 'shipping_updates':
    case 'payment_alerts':
      update.emailNotificationsEnabled = enabled;
      break;
    case 'marketing_emails':
      update.marketingEmailsEnabled = enabled;
      break;
  }

  return updateEmailPreferences(userId, update);
}
