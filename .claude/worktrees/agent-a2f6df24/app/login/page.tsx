'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { signIn, loading } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await signIn(email, password);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    }
  };

  return (
    <div className="min-h-screen bg-kaari-cream/30 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-background rounded-lg shadow-lg p-8">
        <h1 className="font-display text-3xl text-foreground mb-2 text-center">Welcome Back</h1>
        <p className="text-center text-muted-foreground mb-8">Sign in to your Kaari account</p>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-body text-sm text-kaari-dark mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-kaari-dark/40" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-kaari-dark/20 rounded-lg focus:outline-none focus:border-kaari-dark"
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-body text-sm text-kaari-dark mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-kaari-dark/40" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-kaari-dark/20 rounded-lg focus:outline-none focus:border-kaari-dark"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-kaari-dark text-kaari-cream font-body text-sm uppercase tracking-widest hover:bg-kaari-dark/90 disabled:bg-kaari-dark/50 transition-colors rounded-lg flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Sign In
          </button>
        </form>

        <p className="text-center text-kaari-dark/60 mt-6">
          Don't have an account?{' '}
          <Link href="/signup" className="text-kaari-dark font-semibold hover:text-kaari-gold transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
