# Google OAuth Setup Guide

This guide explains how to set up Google OAuth authentication for the Kaari Marketplace application.

## Overview

The application already has Google OAuth implemented in the codebase. You just need to configure it in your Supabase project.

## Prerequisites

- A Supabase project
- Access to Google Cloud Console
- The Kaari Marketplace application deployed or running locally

## Step 1: Configure Google OAuth in Supabase

1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **Providers**
4. Find **Google** in the list and click **Enable**
5. Keep this page open - you'll need the Redirect URL

## Step 2: Create OAuth Credentials in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to **APIs & Services** → **Library**
   - Search for "Google+ API" or "Google Identity API"
   - Click **Enable**

4. Create OAuth 2.0 Credentials:
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client ID**
   - Select **Web application** as the application type
   - Add authorized redirect URIs:
     - For local development: `http://localhost:3000/auth/callback`
     - For production: `https://your-domain.com/auth/callback`
     - Also add the Supabase callback URL: `https://[your-project-id].supabase.co/auth/v1/callback`
   - Click **Create**

5. Note down your **Client ID** and **Client Secret**

## Step 3: Add Credentials to Supabase

1. Return to the Supabase Dashboard (Authentication → Providers → Google)
2. Enter your **Google Client ID**
3. Enter your **Google Client Secret**
4. Click **Save**

## Step 4: Update Environment Variables (Optional)

No additional environment variables are needed for Google OAuth. The configuration is managed entirely through Supabase.

However, ensure your `.env.local` file has the correct Supabase URL and ANON key:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_PROJECT_ID=your-project-id
```

## Step 5: Test the Integration

1. Start your application:
   ```bash
   npm run dev
   ```

2. Navigate to the login page (`/login`)

3. You should see a "Sign in with Google" button

4. Click it and complete the Google authentication flow

5. You should be redirected back to your application and logged in

## How It Works

### Authentication Flow

1. User clicks "Sign in with Google" button
2. The `signInWithGoogle()` function from `AuthContext` is called
3. Supabase redirects to Google's OAuth page
4. User authenticates with Google
5. Google redirects back to Supabase
6. Supabase redirects to `/auth/callback` route
7. The callback route exchanges the code for a session
8. User is redirected to the home page or intended destination

### Code Implementation

The Google OAuth implementation includes:

- **AuthContext** (`contexts/AuthContext.tsx`): Contains `signInWithGoogle()` function
- **Login Page** (`components/pages/Login.tsx`): Has Google sign-in button
- **Signup Page** (`components/pages/Signup.tsx`): Has Google sign-up button
- **Callback Route** (`app/auth/callback/route.ts`): Handles OAuth callback

### User Profile Creation

When a user signs up with Google:
- A user account is created in Supabase Auth
- A profile record is automatically created in the `profiles` table (via database trigger)
- The user's email and name from Google are stored

## Troubleshooting

### Redirect URI Mismatch Error

If you see "redirect_uri_mismatch" error:
- Ensure the redirect URI in Google Cloud Console exactly matches your callback URL
- Include both local and production URLs if testing in different environments
- The Supabase callback URL must be: `https://[your-project-id].supabase.co/auth/v1/callback`

### User Not Created in Profiles Table

If the user profile isn't created:
- Check that the `create_profile_on_user_signup` trigger exists in the database
- Verify the trigger function has proper permissions
- Check Supabase logs for any errors during signup

### Button Not Showing

If the Google sign-in button doesn't appear:
- Ensure you're using the `AuthProvider` wrapper in your app
- Check that the `useAuth` hook is properly imported
- Verify there are no JavaScript errors in the browser console

## Security Considerations

- OAuth secrets are stored securely in Supabase
- Never commit OAuth credentials to version control
- Use environment-specific credentials for development and production
- Enable HTTPS in production to protect OAuth flows
- Review Google's OAuth policies and comply with their terms of service

## Additional Resources

- [Supabase Google OAuth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Next.js Authentication Guide](https://nextjs.org/docs/authentication)

## Support

If you encounter issues:
1. Check the browser console for errors
2. Review Supabase authentication logs
3. Verify your Google Cloud Console configuration
4. Ensure all redirect URIs are properly configured