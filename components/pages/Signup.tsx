'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSignUp, useSignIn } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, Chrome } from 'lucide-react';
import { logger } from '@/lib/logger-client';

export default function Signup() {
  const router = useRouter();
  const { isLoaded: clerkLoaded, signUp, isLoaded } = useSignUp();
  const { signIn } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!signUp) {
        throw new Error('Sign up is not available. Please try again.');
      }

      const result = await signUp.create({
        emailAddress: email,
        password,
        firstName: fullName.split(' ')[0] || fullName,
        lastName: fullName.split(' ').slice(1).join(' ') || undefined,
      });

      if (result.status === 'complete') {
        router.push('/');
        router.refresh();
      } else if (result.status === 'missing_requirements') {
        // Clerk requires additional verification (email, phone, etc.)
        if (result.unverifiedFields.length > 0) {
          // Prepare email verification if needed
          if (result.unverifiedFields.includes('email_address')) {
            await signUp.prepareVerification({ strategy: 'email_code' });
            router.push('/verify-email?email=' + encodeURIComponent(email));
            return;
          }
        }
        router.push('/');
      } else {
        // 'abandoned' or other statuses
        router.push('/');
      }
    } catch (err) {
      logger.error('Signup error:', err);
      const message = err instanceof Error ? err.message : 'Failed to create account';
      // Clerk errors have a `errors` array
      const clerkErr = err as { errors?: { message: string }[] };
      if (clerkErr.errors?.length) {
        setError(clerkErr.errors.map(e => e.message).join(', '));
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      if (!signIn) {
        throw new Error('Sign in is not available.');
      }
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      });
    } catch (err) {
      const clerkErr = err as { errors?: { message: string }[] };
      if (clerkErr.errors?.length) {
        setError(clerkErr.errors.map(e => e.message).join(', '));
      } else {
        setError(err instanceof Error ? err.message : 'Failed to sign up with Google');
      }
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md glass-card-cream border-border/60 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl">Create Account</CardTitle>
          <CardDescription>Sign up to start shopping</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                id="signup-error"
                className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md"
                role="alert"
                aria-live="polite"
                aria-atomic="true"
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                minLength={2}
                aria-label="Full name"
                aria-required="true"
                aria-describedby={error ? "signup-error" : undefined}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-label="Email address"
                aria-required="true"
                aria-describedby={error ? "signup-error" : undefined}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                aria-label="Password"
                aria-required="true"
                aria-describedby="password-help"
              />
              <p id="password-help" className="text-xs text-muted-foreground">
                Must be at least 8 characters long
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading || !clerkLoaded}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              size="lg"
              onClick={handleGoogleSignUp}
              disabled={googleLoading || !clerkLoaded}
              aria-label="Sign up with Google account"
            >
              {googleLoading ? (
                'Signing up...'
              ) : (
                <>
                  <Chrome className="mr-2 h-4 w-4" />
                  Sign up with Google
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
