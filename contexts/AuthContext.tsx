'use client';

/**
 * AuthContext — Clerk-backed auth wrapper.
 * Maintains the same useAuth() API as the previous Supabase implementation
 * so all consuming components work without changes.
 */
import { createContext, useContext, ReactNode } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

/**
 * AuthUser is a simplified user shape that maps Clerk's user
 * to what our components expect (previously a Supabase User).
 */
export interface AuthUser {
  id: string;
  email: string | null;
  user_metadata: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
  };
}

interface AuthContextType {
  user: AuthUser | null;
  session: null;
  loading: boolean;
  isLoaded: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const router = useRouter();

  const user: AuthUser | null = clerkUser
    ? {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
        user_metadata: {
          full_name: clerkUser.fullName ?? undefined,
          name: clerkUser.firstName ?? undefined,
          avatar_url: clerkUser.imageUrl,
        },
      }
    : null;

  const isAdmin =
    (clerkUser?.publicMetadata?.role as string | undefined) === 'admin';

  const signIn = async (_email: string, _password: string) => {
    // Handled by Clerk's hosted UI — redirect to login page
    router.push('/login');
  };

  const signUp = async (_email: string, _password: string, _fullName: string) => {
    router.push('/signup');
  };

  const signOut = async () => {
    await clerkSignOut();
    toast.success('Signed out successfully');
    router.push('/');
  };

  const resetPassword = async (_email: string) => {
    toast.info('Use the "Forgot password" link on the sign-in page');
    router.push('/login');
  };

  const signInWithGoogle = async () => {
    // Handled by Clerk's sign-in UI (Social Connections)
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session: null,
        loading: !isLoaded,
        isLoaded,
        isAdmin,
        signIn,
        signUp,
        signOut,
        resetPassword,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
