# Kaari Handmade - Vercel Deployment Guide

## Step-by-Step Deployment Instructions

### Prerequisites
- GitHub account with repository access
- Vercel account (free tier available at https://vercel.com)
- Supabase project credentials

---

## Option 1: Deploy Using Vercel Dashboard (Recommended)

### Step 1: Connect Your GitHub Repository

1. Go to https://vercel.com and sign in with your GitHub account
2. Click "Add New..." → "Project"
3. Click "Import Git Repository"
4. Find and select your "kaari-handmade" repository
5. Click "Import"

### Step 2: Configure Project Settings

1. **Project Name**: Leave as "kaari-handmade" or customize
2. **Framework Preset**: Select "Next.js" (should auto-detect)
3. **Root Directory**: Leave empty (or "/" if prompted)
4. **Build Command**: Leave as default `npm run build`
5. **Output Directory**: Leave as default `.next`
6. **Install Command**: Leave as default `npm install`

### Step 3: Add Environment Variables

Click "Environment Variables" and add these required variables:

#### Required Variables:
```
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Optional Variables (Add if using payment/analytics):
```
CASHFREE_KEY_ID = your_key_id
CASHFREE_KEY_SECRET = your_key_secret
NEXT_PUBLIC_GA_ID = G-XXXXXXXXXX
```

### Step 4: Deploy

1. Click "Deploy"
2. Wait for the build to complete (usually 3-5 minutes)
3. Once complete, you'll see your live URL
4. Click the URL to visit your site!

---

## Option 2: Deploy Using Vercel CLI

### Step 1: Install Vercel CLI

```bash
npm i -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

Follow the prompts to authenticate with your GitHub account.

### Step 3: Deploy

```bash
cd /path/to/project
vercel
```

### Step 4: Configure Deployment

- **Project name**: kaari-handmade (or press Enter to use folder name)
- **Which scope**: Select your account
- **Link to existing project**: No
- **Build command**: `npm run build`
- **Output directory**: `.next`
- **Development command**: `npm run dev`

### Step 5: Add Environment Variables

```bash
vercel env add
```

Follow prompts to add:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_KEY

Then re-deploy:

```bash
vercel --prod
```

---

## Get Supabase Credentials

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to "Settings" → "API"
4. Copy:
   - **Project URL** → NEXT_PUBLIC_SUPABASE_URL
   - **anon public** → NEXT_PUBLIC_SUPABASE_ANON_KEY
   - **service_role secret** → SUPABASE_SERVICE_KEY

---

## Making the Site Publicly Accessible

### Vercel Default Settings (Already Public)

By default, Vercel deployments are publicly accessible:
- Your site URL: `https://kaari-handmade-[random].vercel.app`
- Anyone with the URL can access it
- No authentication required to view

### Custom Domain (Optional)

To use your own domain:

1. In Vercel dashboard, go to Project Settings → Domains
2. Enter your domain (e.g., `kaari-handmade.com`)
3. Update your domain's DNS records to point to Vercel
4. Vercel will provide DNS records to copy to your domain provider

---

## Test the Deployment

After deployment:

1. **Visit your Vercel URL** (provided in dashboard)
2. **Test homepage**: Should load without errors
3. **Check components**: Verify all images and sections load
4. **Test auth**: Try login/signup pages (requires Supabase setup)
5. **Check console**: Open DevTools (F12) and verify no errors

---

## Troubleshooting

### Build Fails

**Problem**: Deployment fails during build
**Solution**:
1. Check build logs in Vercel dashboard
2. Verify PostCSS config is correct
3. Ensure all dependencies in package.json are installed
4. Run `npm run build` locally to test

### Environment Variables Not Working

**Problem**: "NEXT_PUBLIC_SUPABASE_URL is undefined"
**Solution**:
1. Verify variables are set in Vercel dashboard
2. Ensure variable names are spelled correctly (case-sensitive)
3. Re-deploy after adding variables
4. Check `.env.local` is NOT committed to Git

### Pages Show 404

**Problem**: Routes don't work after deployment
**Solution**:
1. Check that routes exist in `/app` directory
2. Verify middleware.ts isn't blocking navigation
3. Check Next.js config for redirects/rewrites
4. Restart deployment with "Redeploy" button

### Database Not Connected

**Problem**: Auth or database features don't work
**Solution**:
1. Verify Supabase URL and keys are correct
2. Check Supabase project is active (https://supabase.com/dashboard)
3. Verify RLS policies allow public read (if needed)
4. Check database tables exist and are accessible

---

## Continuous Deployment

Once connected to GitHub:

1. **Auto-deploy on push**: Every push to main branch automatically deploys
2. **Preview deployments**: Pull requests get preview URLs
3. **Rollback**: Go to Deployments tab and click a previous deployment
4. **Disable auto-deploy**: Settings → Deployments → uncheck Auto-Deploy

---

## Monitor Your Deployment

### View Logs

1. Vercel dashboard → Deployments
2. Click the deployment
3. View "Build Logs" and "Runtime Logs"

### Performance

1. Vercel dashboard → Analytics
2. View Core Web Vitals, response times, etc.

### Errors

1. Enable Sentry (optional):
   - Sign up at https://sentry.io
   - Add `NEXT_PUBLIC_SENTRY_DSN` environment variable
   - Track errors in production

---

## Post-Deployment Checklist

- ✅ Homepage loads without errors
- ✅ All components visible and styled correctly
- ✅ Navigation works
- ✅ Forms can be submitted
- ✅ Images load properly
- ✅ Mobile responsive design works
- ✅ Custom domain configured (if applicable)
- ✅ Environment variables set correctly
- ✅ Supabase connection working (if using auth/database)
- ✅ No console errors in DevTools

---

## Your Deployment URL

After successful deployment, your site will be live at:

**`https://kaari-handmade-[random].vercel.app`**

This URL is:
- ✅ Publicly accessible
- ✅ Accessible to anyone with the link
- ✅ No authentication required
- ✅ Fast and globally distributed
- ✅ Automatically scaled

---

## Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **Support**: Open an issue in your GitHub repository

---

## What's Next?

After deployment:

1. **Monitor performance**: Check Vercel Analytics
2. **Set up CI/CD**: Automatic tests on each push (optional)
3. **Add custom domain**: Point your domain to Vercel
4. **Enable security**: Add authentication and protected routes
5. **Setup email**: Configure transactional emails via Supabase
6. **Payment processing**: Integrate real payment provider
7. **Add logging**: Setup error tracking with Sentry

---

**Congratulations! Your Kaari Handmade marketplace is now live on the internet.**
