'use client';

import dynamic from 'next/dynamic';

const SignUp = dynamic(
  () => import('@clerk/nextjs').then((m) => ({ default: m.SignUp })),
  { ssr: false }
);

export default function SignupClient() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50 py-12 px-4">
      <SignUp
        routing="hash"
        signInUrl="/login"
        fallbackRedirectUrl="/"
      />
    </main>
  );
}
