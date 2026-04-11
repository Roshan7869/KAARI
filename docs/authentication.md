# Authentication System

The Kaari Marketplace uses Supabase Authentication with support for both email/password and Google OAuth.

## Features

- ✅ Email/Password Authentication
- ✅ Google OAuth Sign-in
- ✅ Protected Routes Middleware
- ✅ Automatic Profile Creation
- ✅ Role-based Access Control (Admin/Customer)
- ✅ Rate Limiting for Auth Endpoints
- ✅ Secure Session Management

## Architecture

### Components

```
app/
├── auth/
│   └── callback/route.ts          # OAuth callback handler
├── login/page.tsx                 # Login page wrapper
├── signup/page.tsx                # Signup page wrapper

components/
├── pages/
│   ├── Login.tsx                  # Login form with Google button
│   └── Signup.tsx                 # Signup form with Google button

contexts/
└── AuthContext.tsx                # Authentication state management

lib/
├── supabase/
│   ├── client.ts                  # Browser Supabase client
│   ├── server.ts                  # Server Supabase client
│   └── middleware.ts              # Session refresh middleware
└── rateLimit.ts                   # Rate limiting for auth

middleware.ts                      # Route protection logic
```

### Authentication Flow

#### Email/Password Signup

1. User submits signup form with email, password, and full name
2. `AuthContext.signUp()` creates user in Supabase Auth
3. Database trigger automatically creates profile record
4. User receives verification email (if enabled)
5. User can sign in after verification

#### Email/Password Signin

1. User submits login form with email and password
2. `AuthContext.signIn()` authenticates with Supabase
3. Session cookie is set
4. Middleware validates session on subsequent requests
5. User is redirected to intended page or home

#### Google OAuth Signin

1. User clicks "Sign in with Google" button
2. `AuthContext.signInWithGoogle()` initiates OAuth flow
3. User authenticates with Google
4. Google redirects to Supabase callback URL
5. Supabase redirects to `/auth/callback`
6. Callback route exchanges code for session
7. Database trigger creates profile record
8. User is redirected to intended page or home

## Configuration

### Environment Variables

Required in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_PROJECT_ID=your-project-id
```

### Supabase Setup

1. **Enable Google OAuth**:
   - Go to Supabase Dashboard → Authentication → Providers
   - Enable Google and add your OAuth credentials
   - See [Google OAuth Setup](./google-oauth-setup.md) for detailed instructions

2. **Database Triggers**:
   - The migration `20260329120000_create_profile_trigger.sql` automatically creates the trigger
   - This trigger creates a profile record when a new user signs up

3. **User Roles**:
   - Users are assigned the 'customer' role by default
   - Admin role must be manually assigned via SQL:
     ```sql
     INSERT INTO user_roles (user_id, role) VALUES ('user-uuid', 'admin');
     ```

## API Reference

### AuthContext

```typescript
const {
  user,           // Current user object
  session,        // Current session
  loading,        // Auth loading state
  isAdmin,        // Boolean indicating admin role
  signIn,         // (email, password) => Promise<void>
  signInWithGoogle, // () => Promise<void>
  signUp,         // (email, password, fullName) => Promise<void>
  signOut,        // () => Promise<void>
  resetPassword,  // (email) => Promise<void>
} = useAuth();
```

### Protected Routes

The middleware automatically protects these routes:

- `/checkout` - Requires authentication
- `/cart` - Requires authentication
- `/payment` - Requires authentication
- `/order-confirmation` - Requires authentication
- `/admin/*` - Requires admin role

### Rate Limiting

Auth endpoints are rate-limited to prevent abuse:

- Login attempts: Limited per email address
- Signup attempts: Limited per IP/email
- Failed attempts tracked and penalized

## Security Features

### Password Security

- Passwords are hashed by Supabase (bcrypt)
- Minimum 8 characters required
- Rate limiting prevents brute force attacks

### Session Management

- HTTP-only cookies for session storage
- CSRF protection built-in
- Automatic session refresh
- Secure logout clears all sessions

### OAuth Security

- PKCE flow for OAuth 2.0
- State parameter validation
- Secure redirect URI validation
- No secrets exposed to client

### Input Validation

- Email format validation
- XSS prevention in all inputs
- SQL injection prevention via prepared statements
- Rate limiting on all auth endpoints

## Testing

Run authentication tests:

```bash
# Run all tests
npm test

# Run auth-specific tests
npx vitest tests/auth-callback.test.ts
```

Test coverage includes:
- Callback route handling
- Session exchange
- Error scenarios
- Redirect validation
- Open redirect prevention

## Common Issues

### User profile not created

**Solution**: Ensure the database trigger is installed:
```bash
supabase migration up
```

### Google sign-in not working

**Solution**: Check:
1. Google OAuth is enabled in Supabase
2. Redirect URIs are configured correctly
3. OAuth credentials are valid
4. No ad blockers interfering

### Session lost on refresh

**Solution**: Check middleware is properly refreshing sessions:
```typescript
// middleware.ts should call supabase.auth.getUser()
```

### Admin access not working

**Solution**: Ensure user has admin role:
```sql
SELECT * FROM user_roles WHERE user_id = 'user-uuid';
```

## Best Practices

### For Users

- Use strong, unique passwords
- Enable 2FA when available
- Sign out when using shared computers
- Keep email address up to date

### For Developers

- Always use `useAuth()` hook instead of direct Supabase calls
- Protect sensitive routes with middleware
- Validate all user inputs
- Never expose auth tokens in client-side code
- Use server-side auth for sensitive operations

### For Admins

- Review audit logs regularly
- Monitor failed login attempts
- Keep OAuth credentials secure
- Rotate secrets periodically

## Migration Guide

### Adding New OAuth Providers

To add a new OAuth provider (e.g., GitHub, Facebook):

1. Enable provider in Supabase Dashboard
2. Add OAuth credentials
3. Add sign-in button to login/signup pages
4. Add provider to `signInWithOAuth` call
5. Update documentation

### Customizing Auth Flow

To customize the authentication flow:

1. Modify `AuthContext` methods
2. Update callback route if needed
3. Adjust middleware protection rules
4. Update database triggers
5. Test thoroughly

## Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js Auth Guide](https://nextjs.org/docs/authentication)
- [Google OAuth Setup](./google-oauth-setup.md)
- [Security Guidelines](../SECURITY.md)
