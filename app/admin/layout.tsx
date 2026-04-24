import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import AdminClientLayout from './AdminClientLayout';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect('/login');
  }

  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;
  if (role !== 'admin') {
    redirect('/');
  }

  return <AdminClientLayout>{children}</AdminClientLayout>;
}
