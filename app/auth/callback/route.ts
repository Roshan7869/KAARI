import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Validates that a redirect URL is safe (relative path)
 * Prevents open redirect attacks
 */
function isValidRedirect(url: string | null): boolean {
  if (!url) return false;
  // Must start with / and NOT start with // (protocol-relative)
  return url.startsWith('/') && !url.startsWith('//');
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // If "next" is in query params, use it as the redirect URL
  // Validate to prevent open redirect attacks
  const nextParam = searchParams.get('next');
  const next = isValidRedirect(nextParam) ? nextParam : '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Successful authentication, redirect to the next URL or home
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=oauth_callback_failed`);
}