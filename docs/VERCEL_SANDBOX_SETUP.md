# Vercel Sandbox Setup for Claude Agent SDK

This guide explains how to configure and deploy Hexframe with Vercel Sandbox support for the Claude Agent SDK.

## Why Vercel Sandbox?

The Claude Agent SDK spawns Node.js subprocesses to execute AI agent workflows. This works fine in local development but **fails in Vercel's standard serverless environment** due to:

- Restricted filesystem access
- Limited/blocked child process spawning
- No persistent runtime for agent execution

**Vercel Sandbox** provides isolated Linux microVMs (Firecracker) that enable safe execution of AI-generated code and agent workflows in production.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Standard Vercel Serverless (tRPC API)                   │
│                                                          │
│  ┌──────────────────────────────────────────┐           │
│  │ AgenticService Factory                   │           │
│  │                                           │           │
│  │  if (useSandbox) {                       │           │
│  │    ClaudeAgentSDKSandboxRepository ──────┼──────┐    │
│  │  } else {                                │      │    │
│  │    ClaudeAgentSDKRepository (dev only)   │      │    │
│  │  }                                       │      │    │
│  └──────────────────────────────────────────┘      │    │
└──────────────────────────────────────────────────┼─────┘
                                                    │
                                                    ▼
                        ┌────────────────────────────────────┐
                        │ Vercel Sandbox (microVM)           │
                        │                                    │
                        │  • Isolated Linux VM               │
                        │  • Node.js 22 runtime              │
                        │  • Claude Agent SDK installed      │
                        │  • Full subprocess support         │
                        │  • 5 minute timeout                │
                        │  • 2 vCPUs allocated              │
                        └────────────────────────────────────┘
```

## Setup Instructions

### 1. Install Dependencies

Already done via `pnpm add @vercel/sandbox ms`

### 2. Get Vercel Access Token

#### Development:
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Pull environment variables (includes development token)
vercel env pull

# This creates .env.local with VERCEL_TOKEN (expires after 12 hours)
```

#### Production (Vercel Dashboard):
1. Go to https://vercel.com/account/tokens
2. Create a new token with name "Hexframe Sandbox Access"
3. Copy the token
4. Go to your Vercel project settings → Environment Variables
5. Add `VERCEL_TOKEN` with the token value
6. Scope: Production

### 3. Configure Environment Variables

Add to your `.env.local` (development) or Vercel Dashboard (production):

```bash
# Enable Vercel Sandbox for Claude Agent SDK
USE_SANDBOX=true

# Vercel Access Token (required when USE_SANDBOX=true)
VERCEL_TOKEN=<your-token-here>

# LLM Provider configuration
LLM_PROVIDER=claude-agent-sdk
ANTHROPIC_API_KEY=sk-ant-...

# Base URL for your application
HEXFRAME_API_BASE_URL=https://hexframe.ai  # Production
# HEXFRAME_API_BASE_URL=http://localhost:3000  # Development
```

### 4. Deploy to Vercel

```bash
# Ensure all environment variables are set in Vercel Dashboard
# Then deploy
git push origin main  # Or your configured branch
```

## Configuration Options

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `USE_SANDBOX` | Yes (prod) | Set to `"true"` to enable Vercel Sandbox |
| `VERCEL_TOKEN` | Yes (if sandbox) | Vercel access token for Sandbox API |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude models |
| `LLM_PROVIDER` | No | Set to `"claude-agent-sdk"` to use Claude SDK |
| `HEXFRAME_API_BASE_URL` | No | Base URL for MCP server, defaults to localhost |

### Sandbox Configuration

Edit [claude-agent-sdk-sandbox.repository.ts](../src/lib/domains/agentic/repositories/claude-agent-sdk-sandbox.repository.ts) to adjust:

```typescript
this.sandbox = await Sandbox.create({
  runtime: 'node22',        // Node.js version
  timeout: ms('5m'),        // Max execution time (5 min default, 5 hour max on Pro)
  resources: {
    vcpus: 2                // CPU allocation (adjust based on needs)
  }
})
```

## Cost Considerations

Vercel Sandbox pricing (as of 2025):
- **Active CPU time**: Billed per vCPU-second
- **Idle time**: Not charged
- **Available on all plans** (currently in beta)

Monitor usage in Vercel Dashboard → Analytics → Sandbox Usage.

## Troubleshooting

### "Sandbox not initialized" error
- Ensure `VERCEL_TOKEN` is set correctly
- Check token hasn't expired (development tokens expire after 12 hours)
- Verify token has correct permissions

### "Failed to initialize Vercel Sandbox"
- Check Vercel account has Sandbox enabled
- Verify network connectivity to Vercel API
- Review logs for specific error details

### Timeout errors
- Increase timeout in sandbox configuration
- Consider breaking long operations into smaller chunks
- Use queue-based processing for very long tasks

### Development vs Production

**Development** (USE_SANDBOX=false):
- Direct Claude SDK execution
- Faster iteration
- No sandbox overhead
- **DO NOT deploy to production** - will fail on Vercel

**Production** (USE_SANDBOX=true):
- Vercel Sandbox isolation
- Safe for production
- Slightly higher latency (~1-2s sandbox initialization)
- Required for Vercel deployment

## Alternative: Disable Claude Agent SDK in Production

If you prefer not to use Vercel Sandbox, you can:

1. Set `LLM_PROVIDER=openrouter` in production
2. Use OpenRouter for production traffic
3. Keep Claude Agent SDK for development only

This is simpler but you lose access to Claude's advanced agent capabilities in production.

## Next Steps

- Monitor sandbox usage and adjust timeout/resources
- Set up alerts for sandbox errors
- Consider implementing caching for frequent agent queries
- Review Claude Agent SDK logs for optimization opportunities

## Resources

- [Vercel Sandbox Documentation](https://vercel.com/docs/vercel-sandbox)
- [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk)
- [Anthropic API Reference](https://docs.anthropic.com)
