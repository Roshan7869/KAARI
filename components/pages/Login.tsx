'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSignIn, useClerk } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, Chrome } from 'lucide-react';
import { logger } from '@/lib/logger-client';

export default function Login() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const clerk = useClerk();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!signIn) {
        throw new Error('Sign in is not available. Please try again.');
      }

      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete' && setActive) {
        await setActive({ session: result.createdSessionId });
        router.push('/');
        router.refresh();
      } else if (result.status === 'needs_first_factor') {
        setError('Invalid email or password. Please try again.');
      } else if (result.status === 'needs_second_factor') {
        setError('Two-factor authentication is required. Please check your authenticator app.');
      } else {
        router.push('/');
      }
    } catch (err) {
      logger.error('Login error:', err);
      const clerkErr = err as { errors?: { message: string }[] };
      if (clerkErr.errors?.length) {
        setError(clerkErr.errors.map(e => e.message).join(', '));
      } else {
        setError(err instanceof Error ? err.message : 'Failed to login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
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
        setError(err instanceof Error ? err.message : 'Failed to sign in with Google');
      }
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-display text-2xl text-center">
            Welcome Back
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div
                id="login-error"
                className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md"
                role="alert"
                aria-live="polite"
                aria-atomic="true"
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="font-body text-sm font-medium">Email</label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="mt-1"
                aria-label="Email address"
                aria-required="true"
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>
            <div>
              <label htmlFor="password" className="font-body text-sm font-medium">Password</label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="mt-1"
                aria-label="Password"
                aria-required="true"
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading || !isLoaded}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
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
              onClick={handleGoogleSignIn}
              disabled={googleLoading || !isLoaded}
              aria-label="Sign in with Google account"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Chrome className="mr-2 h-4 w-4" />
                  Sign in with Google
                </>
              )}
            </Button>

            <p className="font-body text-sm text-center text-muted-foreground">
              {`Don't have an account? `}
              <Link href="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}