# DEPLOYMENT.md - Production Deployment Workflow

This document defines the structured workflow for deploying applications to production environments.

## Deployment Principles

### 1. Security First
- Never expose secrets or API keys
- Validate all environment variables
- Use least-privilege access
- Enable security headers

### 2. Zero-Downtime Deployments
- Ensure backward compatibility
- Use progressive rollouts when possible
- Have rollback procedures ready
- Monitor deployment health

### 3. Environment Parity
- Keep development, staging, and production similar
- Use same versions of dependencies
- Test with production-like data
- Validate environment-specific features

## Pre-Deployment Checklist

### 1. Code Quality Verification
```bash
# Run all quality checks
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build

# Check for security vulnerabilities
pnpm audit
```

### 2. Security Audit
- [ ] No hardcoded secrets in codebase
- [ ] Environment variables properly documented
- [ ] API endpoints have authentication
- [ ] CORS configuration is restrictive
- [ ] Security headers configured
- [ ] Database connections use SSL
- [ ] No console.logs with sensitive data

### 3. Performance Validation
- [ ] Build size is reasonable
- [ ] Images are optimized
- [ ] Code splitting implemented
- [ ] Critical CSS inlined
- [ ] Database queries optimized

## Vercel Deployment

### 1. Project Configuration

Create `vercel.json`:
```json
{
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "regions": ["iad1"],
  "functions": {
    "src/app/api/trpc/[trpc]/route.ts": {
      "maxDuration": 10
    }
  },
  "env": {
    "NODE_ENV": "production"
  },
  "build": {
    "env": {
      "NEXT_TELEMETRY_DISABLED": "1"
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### 2. Environment Variables

Required environment variables for Vercel:

```bash
# Database (use Vercel Postgres or external)
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require

# Authentication
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Optional: Feature flags
NEXT_PUBLIC_ENABLE_OFFLINE_MODE=true
```

### 3. Database Setup

For Vercel deployment with PostgreSQL:

1. **Vercel Postgres** (Recommended for serverless):
   ```bash
   # Automatically sets DATABASE_URL
   vercel env pull
   ```

2. **External Database** (e.g., Supabase, Neon):
   - Enable connection pooling
   - Use `?pgbouncer=true` in connection string
   - Set reasonable connection limits

3. **Migrations**:
   ```bash
   # Run migrations in build step
   # Add to package.json scripts:
   "vercel-build": "pnpm db:generate && pnpm db:migrate && pnpm build"
   ```

### 4. Serverless Considerations

Adapt for serverless environment:

1. **Connection Pooling**:
   ```typescript
   // src/server/db/index.ts
   import { Pool } from '@neondatabase/serverless';
   
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     ssl: true,
   });
   ```

2. **Cold Start Optimization**:
   - Minimize dependencies
   - Lazy load heavy modules
   - Use edge runtime where possible

3. **Function Configuration**:
   ```typescript
   // app/api/route.ts
   export const runtime = 'edge'; // For lighter endpoints
   export const maxDuration = 10; // Timeout in seconds
   ```

## Deployment Workflow

### 1. Pre-Deployment Branch
```bash
# Create deployment branch
git checkout -b deploy/production-YYYY-MM-DD

# Final checks
pnpm lint && pnpm typecheck && pnpm test && pnpm build

# Commit any fixes
git add .
git commit -m "chore: prepare for production deployment"
```

### 2. Environment Validation
```bash
# Check all required env vars are documented
grep -r "process.env" src/ | grep -v "NODE_ENV"

# Ensure .env.example is updated
cp .env.example .env.example.backup
# Add any new variables to .env.example
```

### 3. Security Review
```bash
# Search for potential secrets
grep -r "api[_-]?key\|secret\|password\|token" src/ --include="*.ts" --include="*.tsx"

# Check for debug code
grep -r "console\.\|debugger" src/

# Review API endpoints
find src/app/api -name "*.ts" -o -name "*.tsx" | xargs grep -l "export.*function\|handler"
```

### 4. Deploy to Vercel

1. **Initial Setup** (first time only):
   ```bash
   # Install Vercel CLI
   pnpm add -g vercel
   
   # Link project
   vercel link
   
   # Configure project
   vercel env add DATABASE_URL
   vercel env add NEXTAUTH_SECRET
   # ... add other env vars
   ```

2. **Preview Deployment**:
   ```bash
   # Deploy to preview
   vercel
   
   # Test the preview URL thoroughly
   # Check all critical paths
   # Verify environment variables
   ```

3. **Production Deployment**:
   ```bash
   # Deploy to production
   vercel --prod
   
   # Or use Git integration:
   git push origin deploy/production-YYYY-MM-DD
   # Create PR to main branch
   ```

### 5. Post-Deployment Verification

1. **Smoke Tests**:
   - [ ] Homepage loads
   - [ ] Authentication works
   - [ ] Core features functional
   - [ ] API endpoints respond
   - [ ] Offline mode works

2. **Monitoring**:
   - Check Vercel Functions logs
   - Monitor error rates
   - Verify performance metrics
   - Check database connections

3. **Rollback Plan**:
   ```bash
   # If issues found:
   vercel rollback
   
   # Or redeploy previous version:
   vercel --prod --force
   ```

## Production Checklist

### Before Deployment
- [ ] All tests pass
- [ ] No linting errors
- [ ] Type checking passes
- [ ] Build succeeds
- [ ] Security audit complete
- [ ] Environment variables set
- [ ] Database migrations ready
- [ ] Feature flags configured

### After Deployment
- [ ] Smoke tests pass
- [ ] No console errors
- [ ] Performance acceptable
- [ ] SEO meta tags present
- [ ] Analytics working
- [ ] Error tracking active
- [ ] SSL certificate valid
- [ ] Security headers active

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check Node version matches
   - Verify all dependencies installed
   - Review build logs in Vercel

2. **Database Connection**:
   - Verify DATABASE_URL format
   - Check SSL requirements
   - Test connection pooling

3. **Environment Variables**:
   - Use `vercel env ls` to list
   - Check for typos in names
   - Verify values are correct

4. **Function Timeouts**:
   - Increase maxDuration
   - Optimize database queries
   - Consider edge runtime

## Git Workflow for Deployments

### 1. Deployment Branch
```bash
# Create from main/master
git checkout main
git pull origin main
git checkout -b deploy/production-YYYY-MM-DD
```

### 2. Final Preparations
```bash
# Update version
npm version patch  # or minor/major

# Update changelog
echo "## [$(date +%Y-%m-%d)] - Production Release" >> CHANGELOG.md

git add package.json CHANGELOG.md
git commit -m "chore: bump version for production release"
```

### 3. Create Release
```bash
# Tag the release
git tag -a v1.2.3 -m "Production release v1.2.3"

# Push to trigger deployment
git push origin deploy/production-YYYY-MM-DD --tags
```

### 4. Post-Deployment
```bash
# After successful deployment, merge back
git checkout main
git merge deploy/production-YYYY-MM-DD
git push origin main

# Clean up
git branch -d deploy/production-YYYY-MM-DD
```

## Security Considerations

### API Security
- Use API rate limiting
- Implement request validation
- Add authentication middleware
- Log suspicious activities

### Database Security
- Use parameterized queries
- Implement row-level security
- Encrypt sensitive data
- Regular backups

### Client Security
- Sanitize user inputs
- Implement CSP headers
- Use HTTPS everywhere
- Validate on server side

## Performance Optimization

### Build Optimization
- Enable SWC minification
- Use dynamic imports
- Implement route segments
- Optimize images with next/image

### Runtime Optimization
- Use React Server Components
- Implement proper caching
- Optimize database queries
- Use CDN for static assets

## Monitoring and Alerts

### Setup Monitoring
- Vercel Analytics for performance
- Error tracking (e.g., Sentry)
- Uptime monitoring
- Database query monitoring

### Alert Configuration
- Set up error rate alerts
- Monitor function execution time
- Track failed deployments
- Database connection alerts