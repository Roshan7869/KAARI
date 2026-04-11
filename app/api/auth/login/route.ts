import { NextResponse } from 'next/server';

// This endpoint is deprecated. Authentication is handled by Clerk.
// See: https://clerk.com/docs
export async function POST() {
  return NextResponse.json(
    {
      error: 'This endpoint is no longer available.',
      message: 'Authentication is handled by Clerk. Use the Clerk-powered login UI.',
      docs: 'https://clerk.com/docs',
    },
    { status: 410 }
  );
}