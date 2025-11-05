# Anthropic API Proxy Security

## Problem

When running Claude Agent SDK in Vercel Sandbox, the `ANTHROPIC_API_KEY` must be provided as an environment variable. This creates a security risk: malicious users could extract the API key from the sandbox environment.

## Solution: Secure Proxy

Instead of exposing the API key directly, we route all Anthropic API calls through a secure proxy endpoint.

### Architecture

```
┌─────────────────────────────────────────────┐
│ Vercel Sandbox (Untrusted)                 │
│                                              │
│  Claude Agent SDK                           │
│  ├─ ANTHROPIC_BASE_URL = /api/anthropic... │
│  └─ ANTHROPIC_API_KEY = "placeholder"      │
│                                              │
│  [No real API key exposed]                 │
└──────────────┬──────────────────────────────┘
               │ Authenticated requests
               │ (user_id + secret in URL)
               ▼
┌─────────────────────────────────────────────┐
│ /api/anthropic-proxy (Trusted)             │
│                                              │
│  1. Verify internal auth secret            │
│  2. Check rate limits per user             │
│  3. Add real ANTHROPIC_API_KEY             │
│  4. Forward to api.anthropic.com           │
│  5. Return response                         │
└─────────────────────────────────────────────┘
```

## Implementation

### 1. Proxy Endpoint

**File:** `src/app/api/anthropic-proxy/route.ts`

- Accepts requests with `user_id` and `auth` query parameters
- Validates internal authentication secret
- Enforces per-user rate limiting (50 requests/hour by default)
- Adds the real `ANTHROPIC_API_KEY` before forwarding to Anthropic
- Supports streaming and non-streaming requests

### 2. Sandbox Configuration

**File:** `src/lib/domains/agentic/repositories/claude-agent-sdk-sandbox.repository.ts`

```typescript
// Set proxy URL with authentication
const proxyUrl = `${baseUrl}/api/anthropic-proxy?user_id=${userId}&auth=${secret}`
process.env.ANTHROPIC_BASE_URL = proxyUrl

// Placeholder key (never used)
process.env.ANTHROPIC_API_KEY = 'placeholder-key-not-used'
```

## Security Features

### 1. Internal Authentication
- Requests must include `INTERNAL_PROXY_SECRET`
- Secret is never exposed to sandbox (only in query string generated server-side)
- Generate a strong random secret for production

### 2. Rate Limiting
- 50 requests/hour per user (configurable)
- Prevents abuse even if authentication is compromised
- In-memory tracking (use Redis for production)

### 3. Budget Limits
- `maxBudgetUsd: 1.0` per SDK request
- Additional limit at SDK level
- Prevents runaway costs

### 4. Request Validation
- Body validation before forwarding
- Suspicious pattern detection (optional)
- Request logging for monitoring

## Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...        # Real API key (server-side only)
INTERNAL_PROXY_SECRET=<random>      # Generate with: openssl rand -hex 32

# Optional
HEXFRAME_API_BASE_URL=https://...   # Your app URL for proxy
```

## Production Setup

1. **Generate secure secret:**
   ```bash
   openssl rand -hex 32
   ```

2. **Add to Vercel:**
   - Go to Project Settings → Environment Variables
   - Add `INTERNAL_PROXY_SECRET` with the generated value
   - Scope: Production, Preview, Development

3. **Verify:**
   - `ANTHROPIC_API_KEY` is set (for proxy to use)
   - `INTERNAL_PROXY_SECRET` is set (for auth)
   - `HEXFRAME_API_BASE_URL` points to your domain

## Monitoring

Monitor for:
- Rate limit violations (potential abuse)
- Failed auth attempts
- Unusual API usage patterns
- High costs per user

Check logs:
```typescript
loggers.agentic('Anthropic proxy: ...', { userId, ... })
```

## Limitations

### What This Protects Against
✅ Direct API key extraction from process.env
✅ Unlimited API usage per user
✅ Untracked API consumption

### What This Doesn't Protect Against
⚠️ Sophisticated attacks (sandbox escape, timing attacks)
⚠️ Auth secret extraction (if sandbox can read its own request URLs)
⚠️ Replay attacks (no nonce/timestamp validation)

### Additional Hardening (Optional)

For maximum security:
1. **Use time-based tokens:** Include timestamp in auth, reject old requests
2. **Use per-request nonces:** Prevent replay attacks
3. **Use Redis for rate limiting:** More robust than in-memory
4. **Monitor sandbox logs:** Detect key extraction attempts
5. **Rotate secrets regularly:** Weekly/monthly rotation

## Cost Control

Even with leaked credentials, damage is limited by:
- **Rate limiting:** 50 req/hour = max ~$1-2/hour (at $0.02/req avg)
- **Budget limits:** $1.00 max per SDK request
- **Monitoring:** Alerts on unusual usage

## Alternative: Don't Use Sandbox

If security concerns are too high:
- Set `LLM_PROVIDER=openrouter` in production
- Keep Claude SDK for development only
- Simpler but loses agent capabilities

## References

- [Anthropic SDK Base URL](https://github.com/anthropics/anthropic-sdk-typescript)
- [Vercel Sandbox Docs](https://vercel.com/docs/vercel-sandbox)
- [Implementation PR](#) <!-- Add PR link when merged -->
