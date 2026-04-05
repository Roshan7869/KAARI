# Kaari Marketplace Deployment Guide

## 📦 Deployment Options

### 1. Vercel (Recommended)

Vercel is the best choice for Next.js applications with seamless deployment.

#### Prerequisites
- Vercel account (free tier available)
- GitHub repository
- Environment variables from Supabase

#### Step-by-Step Deployment

1. **Connect Repository**
```bash
# Push your code to GitHub
git push origin main
```

2. **Import Project in Vercel**
   - Go to https://vercel.com/new
   - Connect your GitHub repository
   - Select the `nextjs-app` directory as root

3. **Configure Environment Variables**
   In Vercel dashboard → Settings → Environment Variables:

   ```
   NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key
   NEXT_PUBLIC_SUPABASE_PROJECT_ID = your-project-id
   NEXT_PUBLIC_APP_URL = https://your-domain.com
   SUPABASE_SERVICE_KEY = your-service-key (Production only)
   WEBHOOK_SECRET = your-webhook-secret (Production only)
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy
   - Your app is live!

#### Production Optimizations

```bash
# Before deployment
npm run prebuild      # Type-check & lint
npm run build         # Production build
npm run test          # Run tests
```

### 2. Docker Deployment

For self-hosted or containerized deployments.

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependencies
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t kaari-marketplace .
docker run -p 3000:3000 -e NEXT_PUBLIC_SUPABASE_URL=... kaari-marketplace
```

### 3. Traditional Hosting (VPS/Dedicated Server)

#### Prerequisites
- Node.js 18+ installed
- npm or yarn
- Process manager (PM2 recommended)
- Nginx or Apache as reverse proxy

#### Installation & Setup

```bash
# 1. Clone repository
git clone your-repo-url
cd nextjs-app

# 2. Install dependencies
npm ci

# 3. Build application
npm run build

# 4. Install PM2 globally
npm install -g pm2

# 5. Start with PM2
pm2 start "npm start" --name "kaari-marketplace"

# 6. Configure Nginx
sudo nano /etc/nginx/sites-available/kaari-marketplace
```

Nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable SSL with Let's Encrypt:
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 🔒 Security Checklist

Before deploying to production:

- [ ] All environment variables are set in Vercel/hosting
- [ ] Database backups are configured in Supabase
- [ ] WEBHOOK_SECRET is strong and stored securely
- [ ] CORS is configured for your domain
- [ ] Database Row Level Security (RLS) is enabled
- [ ] Admin role is assigned to your user
- [ ] Rate limiting is active
- [ ] HTTPS/SSL is configured
- [ ] Content Security Policy headers are set
- [ ] Security scanning has passed

---

## 🚀 Post-Deployment

### Health Check
```bash
curl https://your-domain.com/api/health
# Expected response: { "status": "ok", "timestamp": "..." }
```

### Monitoring

#### Error Tracking (Optional)
Set up Sentry for production error monitoring:

```bash
npm install @sentry/nextjs
```

In `next.config.ts`:
```typescript
import { withSentryConfig } from '@sentry/nextjs';

export default withSentryConfig(nextConfig, {
  org: "your-org",
  project: "kaari-marketplace",
});
```

#### Analytics
- Google Analytics: Add GTM ID to environment
- Vercel Analytics: Automatically enabled
- Database monitoring: Use Supabase dashboard

### Database Migrations

If you make database schema changes:

```bash
# On your local machine
supabase migration new add_new_column
supabase db push

# On production (automatic with Supabase)
# Migrations are tracked and applied in order
```

---

## 🔄 Continuous Deployment

### GitHub Actions CI/CD

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Run lint
        run: npm run lint

      - name: Deploy to Vercel
        run: npx vercel --prod
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

---

## 🛠️ Troubleshooting

### "NEXT_PUBLIC_SUPABASE_URL is required"
- Check .env.local file exists in nextjs-app/ directory
- Verify variable names (NEXT_PUBLIC_ prefix required)
- Restart dev server after changing .env

### Build fails with "Module not found"
- Run `npm install` to install all dependencies
- Check import paths use @/ alias correctly
- Verify TypeScript errors: `npm run type-check`

### Slow deployment on Vercel
- Check bundle size: `npm run build -- --analyze`
- Reduce dependencies
- Enable Vercel Analytics for performance insights

### Database connection errors
- Verify NEXT_PUBLIC_SUPABASE_URL is correct
- Check Supabase project is active
- Ensure Row Level Security policies allow operations
- Check user is properly authenticated

---

## 📊 Performance Targets

After deployment, verify:

- **First Contentful Paint**: < 2.5s
- **Largest Contentful Paint**: < 2.5s
- **Time to Interactive**: < 3.5s
- **Cumulative Layout Shift**: < 0.1
- **Lighthouse Score**: > 90

Monitor with:
- Vercel Analytics
- Google PageSpeed Insights
- Lighthouse CI

---

## 📞 Support

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **GitHub Issues**: Create issues in your repository

---

**Deployment Status**: ✅ Ready for Production

Last Updated: March 22, 2026
