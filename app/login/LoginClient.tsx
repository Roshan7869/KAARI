'use client';

import dynamic from 'next/dynamic';

const SignIn = dynamic(
  () => import('@clerk/nextjs').then((m) => ({ default: m.SignIn })),
  { ssr: false }
);

export default function LoginClient() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50 py-12 px-4">
      <SignIn
        routing="hash"
        signUpUrl="/signup"
        fallbackRedirectUrl="/"
      />
    </main>
  );
}
