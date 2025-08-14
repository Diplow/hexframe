# Fixing Production Environment Variables on Vercel

## The Problem
The verification emails in production are using the wrong URL (a Vercel deployment URL instead of hexframe.ai).

## Root Cause
Vercel automatically provides `VERCEL_URL` and `NEXT_PUBLIC_VERCEL_URL` environment variables that point to the deployment URL. These change with each deployment and point to preview URLs like `hexframe-abc123.vercel.app`.

## Solution

### 1. Go to Vercel Dashboard
1. Navigate to your project settings
2. Go to "Settings" → "Environment Variables"

### 2. Set Production Environment Variables
Ensure these variables are set for the **Production** environment:

```
BETTER_AUTH_URL=https://hexframe.ai
NEXT_PUBLIC_BETTER_AUTH_URL=https://hexframe.ai
```

**Important:** 
- Make sure these are set for "Production" environment specifically
- Do NOT use `VERCEL_URL` or any Vercel-generated URLs
- Use your actual domain (hexframe.ai)

### 3. Required Email Variables
Also ensure these are set for email verification to work:

```
BREVO_API_KEY=xkeysib-[your-key]
EMAIL_FROM=noreply@hexframe.ai
```

### 4. Other Required Variables
```
AUTH_SECRET=[your-secret]
DATABASE_URL=[your-database-url]
OPENROUTER_API_KEY=[your-key]
```

### 5. Redeploy
After setting the environment variables:
1. Trigger a new deployment to production
2. Test the email verification flow

## Verification
To verify the fix is working:
1. Check the verification email - the link should point to `https://hexframe.ai/api/auth/verify-email?token=...`
2. The link should not contain any `vercel.app` domains
3. Clicking the link should successfully verify the email and redirect to `/auth/verify-success`

## Note for Preview Deployments
Preview deployments will still use their own URLs (which is fine for testing). Only production should use hexframe.ai.