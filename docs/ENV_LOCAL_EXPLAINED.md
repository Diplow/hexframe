# Understanding `.env.local` from `vercel env pull`

## What Happened

When you run `vercel env pull .env.local`, it pulls environment variables from your **Vercel project's development environment**. However, this can be confusing because:

### ⚠️ The Problem

Even though you asked for "development" environment variables, **Vercel pulls production-like values**:

```bash
DATABASE_URL="postgres://...neon.tech/neondb"  # ← PRODUCTION database!
BETTER_AUTH_URL="https://hexframe.ai"          # ← PRODUCTION URL!
```

This happens because in your Vercel dashboard, the "development" environment is configured with production database credentials (probably for preview deployments to work).

### ✅ What Actually IS for Local Development

Only one thing in the pulled file is truly local-development specific:

```bash
VERCEL_OIDC_TOKEN="eyJ..."  # ← Development-scoped token (expires in 12 hours)
```

This token:
- Is scoped to `environment:development`
- Allows Vercel Sandbox to authenticate
- Expires after 12 hours
- Needs to be refreshed with `vercel env pull` again

## The Solution: Two Approaches

### Approach 1: Keep `.env` for Local, Pull OIDC Token Only (Recommended)

**Best practice**: Keep your existing `.env` file for local development, only extract the VERCEL_OIDC_TOKEN from `.env.local`:

```bash
# Step 1: Pull token
vercel env pull .env.local

# Step 2: Extract only the token
grep VERCEL_OIDC_TOKEN .env.local >> .env

# Step 3: Remove .env.local (to avoid confusion)
rm .env.local

# Step 4: Add sandbox config to your .env
echo "USE_SANDBOX=true" >> .env
echo "LLM_PROVIDER=claude-agent-sdk" >> .env
```

Your `.env` file then has:
- ✅ Local database: `postgresql://postgres:...@localhost:5432/vde`
- ✅ Local URLs: `http://localhost:3000`
- ✅ Vercel sandbox token: `VERCEL_OIDC_TOKEN=...`
- ✅ Sandbox enabled: `USE_SANDBOX=true`

### Approach 2: Use `.env.local` But Override Production Values

Keep `.env.local` but override the production values:

**File: `.env.local`**
```bash
# From vercel env pull (KEEP THIS)
VERCEL_OIDC_TOKEN="eyJ..."

# OVERRIDE production values with local ones
DATABASE_URL="postgresql://postgres:Oe7jieg_@localhost:5432/vde"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"

# Sandbox configuration
USE_SANDBOX=true
ANTHROPIC_API_KEY="sk-ant-..."
LLM_PROVIDER=claude-agent-sdk
HEXFRAME_API_BASE_URL=http://localhost:3000
```

## Why Does `vercel env pull` Include Production Values?

This is intentional by Vercel. The "development" environment in your Vercel project is meant for:
- **Preview deployments** (e.g., when you push a branch)
- **Vercel dev command** (runs serverless functions locally)

Preview deployments need access to production-like infrastructure (database, APIs) to work properly, so Vercel configures "development" environment with production credentials.

## File Priority in Next.js

Next.js loads environment files in this order (later overrides earlier):

1. `.env` - Base configuration
2. `.env.local` - **Local overrides** (highest priority, not committed to git)
3. `.env.development` - Development-specific (if NODE_ENV=development)
4. `.env.development.local` - Local dev overrides

So if you have:
- `.env`: `DATABASE_URL=postgres://localhost:5432/vde`
- `.env.local`: `DATABASE_URL=postgres://neon.tech/neondb`

**`.env.local` wins!** You'll connect to production.

## Recommended Setup for Sandbox Testing

### Option A: Use Your Existing `.env` (Simplest)

```bash
# Just add to your existing .env file:
echo "VERCEL_OIDC_TOKEN=..." >> .env  # From vercel env pull
echo "USE_SANDBOX=true" >> .env
echo "LLM_PROVIDER=claude-agent-sdk" >> .env
```

**Pros:**
- ✅ Simple
- ✅ Already configured with local database
- ✅ No confusion about which file is active

**Cons:**
- ⚠️ Token expires every 12 hours (need to re-pull)

### Option B: Create Separate `.env.sandbox-test` (Cleanest)

```bash
# Create a dedicated file for sandbox testing
cp .env .env.sandbox-test

# Add sandbox-specific variables
echo "VERCEL_OIDC_TOKEN=..." >> .env.sandbox-test
echo "USE_SANDBOX=true" >> .env.sandbox-test
echo "LLM_PROVIDER=claude-agent-sdk" >> .env.sandbox-test

# Use it explicitly
cp .env.sandbox-test .env.local
pnpm dev
```

**Pros:**
- ✅ Clean separation
- ✅ Easy to switch between configs
- ✅ Can commit `.env.sandbox-test.example` to git

**Cons:**
- ⚠️ Need to remember to copy it to `.env.local`

## What We Created for You

I created `.env.local.sandbox-test` with:
- ✅ VERCEL_OIDC_TOKEN from the pulled file
- ✅ LOCAL database URL (localhost)
- ✅ LOCAL auth URLs (localhost:3000)
- ✅ Sandbox configuration
- ✅ Other local settings from your `.env`

## To Use It

```bash
# Option 1: Replace .env.local
cp .env.local.sandbox-test .env.local
pnpm dev

# Option 2: Just use your .env (add VERCEL_OIDC_TOKEN manually)
# Edit .env and add:
VERCEL_OIDC_TOKEN="eyJ..."
USE_SANDBOX=true
LLM_PROVIDER=claude-agent-sdk
```

## Quick Reference

| Variable | Production (from vercel) | Local (what you need) |
|----------|--------------------------|----------------------|
| `DATABASE_URL` | `postgres://...neon.tech/neondb` | `postgresql://postgres:...@localhost:5432/vde` |
| `BETTER_AUTH_URL` | `https://hexframe.ai` | `http://localhost:3000` |
| `VERCEL_OIDC_TOKEN` | ✅ Use this | ✅ Use this |
| `USE_SANDBOX` | (not set) | `true` |

## Token Expiration

The `VERCEL_OIDC_TOKEN` expires after **12 hours**. When it expires:

```bash
# Error you'll see
Error: Failed to initialize Vercel Sandbox. VERCEL_TOKEN expired.

# Solution: Refresh the token
vercel env pull .env.local
# Then extract VERCEL_OIDC_TOKEN again
```

## Summary

**TL;DR:**
1. `vercel env pull` gives you production database URLs (by design)
2. You need to override them with local values
3. Only keep the `VERCEL_OIDC_TOKEN` from the pulled file
4. I created `.env.local.sandbox-test` with correct local values for you
5. Use it: `cp .env.local.sandbox-test .env.local && pnpm dev`

**Safest approach:**
- Keep your `.env` file as-is (already has local settings)
- Just add `VERCEL_OIDC_TOKEN` from vercel env pull
- Add `USE_SANDBOX=true`
- Delete `.env.local` to avoid confusion
