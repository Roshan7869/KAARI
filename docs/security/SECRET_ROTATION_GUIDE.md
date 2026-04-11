# Secrets Rotation Guide

This guide outlines procedures for rotating and securing environment variables and API keys in the Kaari Marketplace project.

## Current Status Assessment

Based on our analysis:

✅ `.env.local` is properly excluded from Git via `.gitignore`  
✅ `.env.local` is not currently tracked by Git  
✅ No evidence of secrets being committed to the repository  

## Immediate Security Recommendations

### 1. Verify All Secrets Are Secure

Even though there's no evidence of secrets being committed, it's prudent to rotate all sensitive credentials as a precautionary measure.

#### Cashfree Payments
- Log into Cashfree Merchant Dashboard
- Navigate to Developers → API Keys
- Click "Regenerate" for both Application ID and Secret Key
- Update `.env.local` with new values

#### Supabase
- In Supabase Console → Settings → API
- Regenerate the Service Role Key
- Update `.env.local` with new value

#### Clerk Authentication
- In Clerk Dashboard → API Keys
- Regenerate the Secret Key
- Update `.env.local` with new value

#### Cloudinary
- In Cloudinary Console → Settings → Access Keys
- Regenerate API Secret
- Update `.env.local` with new value

#### Upstash Redis
- In Upstash Console → Database → REST API
- Regenerate REST Token
- Update `.env.local` with new value

#### Resend Email Service
- In Resend Dashboard → API Keys
- Create new API Key
- Update `.env.local` with new value

### 2. Implement Monitoring

- Set up alerts for exposed secrets using tools like GitHub Advanced Security
- Add automated scanning to CI/CD pipeline to catch accidental secret commits

### 3. Review Access Controls

- Ensure that only authorized developers have access to production credentials
- Store secrets in encrypted vault systems in production (AWS Secrets Manager, HashiCorp Vault, etc.)
- Regularly audit who has access to sensitive credentials

## Security Best Practices

### Environment Variable Management
1. Always use `.env.local` for sensitive data
2. Never commit real secrets to version control, even in private repositories
3. Use `.env.example` as template with dummy values
4. Use descriptive variable names and comments

### Git Hygiene
1. Regularly audit `.gitignore` for completeness
2. Periodically scan repository for exposed secrets using tools like `trufflehog`
3. Enable branch protection rules to prevent force pushes

### Incident Response Plan
If secrets are ever exposed:
1. Immediately rotate the compromised credentials
2. Revoke exposed keys/tokens in their respective dashboards
3. Scan git history for other potentially exposed secrets
4. Consider git history rewrite using `git filter-branch` or BFG Repo-Cleaner if necessary

## Key Rotation Checklist

- [ ] Cashfree App ID & Secret Key
- [ ] Supabase Service Role Key
- [ ] Clerk Secret Key
- [ ] Cloudinary API Secret
- [ ] Upstash Redis Token
- [ ] Resend API Key
- [ ] Update all values in `.env.local`
- [ ] Restart application services
- [ ] Test payment flows in staging environment
- [ ] Document rotation date and reason

## Environment Verification Script

To verify that environment variables are correctly configured:

```bash
#!/bin/bash
# verify-env.sh

required_vars=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
  "CLERK_SECRET_KEY"
  "CASHFREE_APP_ID"
  "CASHFREE_SECRET_KEY"
  "CASHFREE_WEBHOOK_SECRET"
  # Add other required variables
)

echo "Checking required environment variables..."
for var in "${required_vars[@]}"; do
  if [[ -z "${!var}" ]]; then
    echo "❌ Missing: $var"
    exit 1
  else
    echo "✅ Found: $var"
  fi
done

echo "✅ All required environment variables are present"
```

Run with: `chmod +x verify-env.sh && ./verify-env.sh`

---
*Last Updated: April 9, 2026*