/**
 * Clerk-to-Supabase ID resolver.
 *
 * Clerk user IDs (e.g. "user_3C9UBthJhojlqP7qDLlZ2pnbBRW") are NOT valid UUIDs,
 * but Supabase tables use UUID primary keys. This module resolves a Clerk ID
 * to the corresponding Supabase profile UUID via the `clerk_id` column.
 *
 * Usage in API routes:
 *   const { userId } = await auth();
 *   const supabaseUserId = await getSupabaseUserId(userId);
 *   // Use supabaseUserId for all Supabase queries
 */

import { clerkClient } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger-server';

async function provisionSupabaseProfile(clerkUserId: string): Promise<string | null> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);
    const primaryEmail =
      user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      null;
    const primaryPhone =
      user.phoneNumbers.find((phone) => phone.id === user.primaryPhoneNumberId)?.phoneNumber ?? null;
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || null;

    const supabase = createAdminClient();

    // First check if a profile already exists for this clerk_id
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', clerkUserId)
      .maybeSingle();

    if (existingProfile?.id) {
      // Profile exists — update it
      const { data, error } = await supabase
        .from('profiles')
        .update({
          email: primaryEmail,
          full_name: fullName,
          phone: primaryPhone,
          avatar_url: user.imageUrl ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('clerk_id', clerkUserId)
        .select('id')
        .single();

      if (error) {
        logger.error('Failed to update Supabase profile from Clerk', {
          clerkUserId,
          error: error.message,
        });
        return null;
      }

      return data.id;
    }

    // No existing profile — insert with a generated UUID for id
    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: crypto.randomUUID(),
          clerk_id: clerkUserId,
          email: primaryEmail,
          full_name: fullName,
          phone: primaryPhone,
          avatar_url: user.imageUrl ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'clerk_id' }
      )
      .select('id')
      .single();

    if (error) {
      logger.error('Failed to auto-provision Supabase profile from Clerk', {
        clerkUserId,
        error: error.message,
      });
      return null;
    }

    logger.info('Auto-provisioned Supabase profile from Clerk', {
      clerkUserId,
      profileId: data.id,
    });

    return data.id;
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to fetch Clerk user for Supabase provisioning', {
      clerkUserId,
      error: err.message,
    });
    return null;
  }
}

/**
 * Resolve a Clerk user ID to a Supabase profile UUID.
 *
 * Looks up the `clerk_id` column in the `profiles` table.
 * Returns null if the profile doesn't exist yet.
 *
 * @param clerkUserId - The Clerk user ID (e.g. "user_3C9UBthJhojlqP7qDLlZ2pnbBRW")
 * @returns The Supabase profile UUID, or null if not found
 */
export async function getSupabaseUserId(clerkUserId: string): Promise<string | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_id', clerkUserId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to resolve Clerk ID to Supabase UUID', {
      clerkUserId,
      error: error.message,
    });
    return null;
  }

  return data?.id ?? null;
}

/**
 * Resolve a Clerk user ID to a Supabase profile UUID, throwing on failure.
 *
 * Use this in API routes where a missing profile is a 500-level error
 * (e.g. cart operations that require an authenticated user with a profile).
 *
 * @param clerkUserId - The Clerk user ID
 * @returns The Supabase profile UUID
 * @throws Error if the profile doesn't exist
 */
export async function requireSupabaseUserId(clerkUserId: string): Promise<string> {
  const id = await getSupabaseUserId(clerkUserId);
  if (id) {
    return id;
  }

  const provisionedId = await provisionSupabaseProfile(clerkUserId);
  if (provisionedId) {
    return provisionedId;
  }

  throw new Error(
    `Supabase profile not found for Clerk user ${clerkUserId}. ` +
    'Ensure the Clerk webhook is configured or let the server auto-provision the profile.'
  );
}