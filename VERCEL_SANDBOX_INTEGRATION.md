# Vercel Sandbox Integration - Summary

## ✅ Integration Complete

Hexframe now supports Vercel Sandbox for safe production deployment of the Claude Agent SDK.

## What Was Implemented

### 1. New Repository Implementation
- **File**: [src/lib/domains/agentic/repositories/claude-agent-sdk-sandbox.repository.ts](src/lib/domains/agentic/repositories/claude-agent-sdk-sandbox.repository.ts)
- **Purpose**: Wraps Claude Agent SDK execution in Vercel Sandbox microVMs
- **Features**:
  - Automatic sandbox initialization with Node.js 22 runtime
  - 5-minute timeout with 2 vCPU allocation
  - Installs Claude Agent SDK in isolated environment
  - Executes agent queries via subprocess in microVM
  - Handles errors and validates response format

### 2. Factory Integration
- **File**: [src/lib/domains/agentic/services/agentic.factory.ts](src/lib/domains/agentic/services/agentic.factory.ts)
- **Changes**:
  - Added `useSandbox` configuration option
  - Routes to `ClaudeAgentSDKSandboxRepository` when `useSandbox=true`
  - Falls back to direct SDK for development (`useSandbox=false`)

### 3. tRPC Router Updates
- **File**: [src/server/api/routers/agentic/agentic.ts](src/server/api/routers/agentic/agentic.ts)
- **Changes**:
  - All three endpoints updated: `generateResponse`, `generateStreamingResponse`, `getAvailableModels`
  - Passes `useSandbox: env.USE_SANDBOX === 'true'` to factory
  - Automatically enables sandbox mode when environment variable is set

### 4. Environment Configuration
- **Files**:
  - [src/env.js](src/env.js) - Added `USE_SANDBOX` and `VERCEL_TOKEN` validation
  - [.env.production.example](.env.production.example) - Added documentation and examples

### 5. Dependencies
- **Added**:
  - `@vercel/sandbox ^1.0.2` - Vercel Sandbox SDK
  - `ms ^2.1.3` - Time conversion utility
  - `@types/ms ^2.1.0` (dev) - TypeScript types for ms

### 6. Documentation
- **Files**:
  - [docs/VERCEL_SANDBOX_SETUP.md](docs/VERCEL_SANDBOX_SETUP.md) - Complete setup guide
  - [VERCEL_SANDBOX_INTEGRATION.md](VERCEL_SANDBOX_INTEGRATION.md) - This summary

## How It Works

```
┌──────────────────────────────┐
│ tRPC API                     │
│ (generateResponse)           │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ AgenticService Factory       │
│                              │
│ if (useSandbox) {           │
│   Sandbox Repository ────────┼───┐
│ } else {                     │   │
│   Direct SDK (dev only)      │   │
│ }                            │   │
└──────────────────────────────┘   │
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │ Vercel Sandbox (microVM) │
                    │                          │
                    │ • Isolated Linux VM      │
                    │ • Node.js 22             │
                    │ • Claude SDK installed   │
                    │ • Full subprocess support│
                    └──────────────────────────┘
```

## Configuration

### Environment Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `USE_SANDBOX` | `"true"` | Enable Vercel Sandbox (required for production) |
| `VERCEL_TOKEN` | `<token>` | Vercel access token (get from vercel.com/account/tokens) |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Anthropic API key (used by proxy, never exposed to sandbox) |
| `INTERNAL_PROXY_SECRET` | `<random-secret>` | Secret for authenticating internal proxy requests |
| `LLM_PROVIDER` | `"claude-agent-sdk"` | Enable Claude SDK provider |

### Development Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Login and pull development token
vercel login
vercel env pull  # Creates .env.local with VERCEL_TOKEN

# Add to .env.local
USE_SANDBOX=false  # Use direct SDK in dev for faster iteration
ANTHROPIC_API_KEY=sk-ant-...
LLM_PROVIDER=claude-agent-sdk
```

### Production Setup (Vercel Dashboard)

1. Get Vercel token: https://vercel.com/account/tokens
2. In Vercel project settings → Environment Variables, add:
   - `USE_SANDBOX=true`
   - `VERCEL_TOKEN=<your-token>`
   - `ANTHROPIC_API_KEY=sk-ant-...`
   - `LLM_PROVIDER=claude-agent-sdk`
3. Deploy

## Why This Was Necessary

The Claude Agent SDK spawns Node.js subprocesses to execute agent workflows. This **fails in standard Vercel serverless** because:
- Restricted filesystem access
- Limited child process spawning
- No persistent runtime environment

**Vercel Sandbox provides**:
- Isolated Firecracker microVMs
- Full Node.js runtime with subprocess support
- Safe execution of AI-generated code
- Available on all Vercel plans (currently beta)

## Testing

All checks passing:
- ✅ TypeScript type checking (`pnpm typecheck`)
- ✅ ESLint linting (`pnpm check:lint`)
- ⚠️  2 minor warnings in test file (unused variables, non-critical)

## Next Steps Before Production

1. **Get Vercel Token**:
   ```bash
   # Visit https://vercel.com/account/tokens
   # Create token named "Hexframe Sandbox Access"
   # Add to Vercel Dashboard → Environment Variables
   ```

2. **Set Environment Variables** in Vercel Dashboard:
   - `USE_SANDBOX=true`
   - `VERCEL_TOKEN=<your-token>`
   - `ANTHROPIC_API_KEY=<your-key>`
   - `LLM_PROVIDER=claude-agent-sdk`

3. **Test on Preview Deployment**:
   ```bash
   git checkout -b test-sandbox
   git push origin test-sandbox
   # Test the preview deployment before merging to main
   ```

4. **Monitor Costs**:
   - Vercel Sandbox bills per vCPU-second of active usage
   - Check Vercel Dashboard → Analytics → Sandbox Usage
   - Set up budget alerts if needed

## Alternative Approach

If you prefer not to use Vercel Sandbox, you can:
- Set `LLM_PROVIDER=openrouter` in production
- Use OpenRouter for all production traffic
- Keep Claude Agent SDK for development only

This is simpler but loses access to Claude's advanced agent capabilities in production.

## Files Modified

```
src/
├── env.js                                      # Added USE_SANDBOX, VERCEL_TOKEN
├── lib/domains/agentic/
│   ├── repositories/
│   │   ├── claude-agent-sdk-sandbox.repository.ts  # NEW
│   │   └── index.ts                           # Export new repository
│   └── services/
│       └── agentic.factory.ts                 # Added useSandbox logic
└── server/api/routers/agentic/
    └── agentic.ts                             # Pass useSandbox to factory

.env.production.example                         # Added sandbox configuration
docs/VERCEL_SANDBOX_SETUP.md                   # NEW - Setup guide
VERCEL_SANDBOX_INTEGRATION.md                  # NEW - This file

package.json                                    # Added @vercel/sandbox, ms, @types/ms
```

## Resources

- [Vercel Sandbox Docs](https://vercel.com/docs/vercel-sandbox)
- [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk)
- [Setup Guide](docs/VERCEL_SANDBOX_SETUP.md)
