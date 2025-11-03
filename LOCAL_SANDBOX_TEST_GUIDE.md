# Local Vercel Sandbox Testing Guide

## Prerequisites
- ✅ Vercel CLI installed
- ✅ Logged into Vercel (`vercel whoami` shows your username)
- ✅ ANTHROPIC_API_KEY in .env file

## Step 1: Get Vercel Development Token

You have two options:

### Option A: Link Project and Auto-Pull Token (Recommended if you have a Vercel project)

```bash
# Link to your existing Vercel project
vercel link

# Pull development environment variables (includes VERCEL_TOKEN)
vercel env pull .env.local
```

### Option B: Get Token Manually (Quick Start)

1. Visit: https://vercel.com/account/tokens
2. Click "Create Token"
3. Name: "Hexframe Local Development"
4. Scope: Your account or team
5. Expiration: 30 days (for testing)
6. Copy the token (starts with something like `iJKV1QiLC...`)

## Step 2: Configure Local Environment

Add to your `.env` file (or create `.env.local`):

```bash
# Enable Vercel Sandbox
USE_SANDBOX=true

# Vercel development token (from Step 1)
VERCEL_TOKEN=your_token_here

# Ensure these are set (should already be in .env)
ANTHROPIC_API_KEY=sk-ant-...
LLM_PROVIDER=claude-agent-sdk  # Optional, defaults to openrouter
```

## Step 3: Verify Configuration

```bash
# Check environment variables are loaded
grep VERCEL_TOKEN .env
grep ANTHROPIC_API_KEY .env
grep USE_SANDBOX .env
```

## Step 4: Start Development Server

```bash
# Start the Next.js dev server
pnpm dev
```

You should see output like:
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
- info Loaded env from /path/to/hexframe/.env
```

## Step 5: Test Sandbox Mode

### Option A: Via Web UI (Easiest)

1. Open browser: http://localhost:3000
2. Login to your account
3. Navigate to your map
4. Open the chat panel
5. Send a message to the AI assistant
6. **Watch the terminal logs** - You should see:

```bash
[agentic] Initializing Vercel Sandbox { hasVercelToken: true }
[agentic] Vercel Sandbox initialized successfully
[agentic] Claude Agent SDK Sandbox Request { model: '...', messageCount: ... }
[agentic] Claude Agent SDK Sandbox Response { model: '...', contentLength: ... }
```

### Option B: Via API Direct Call (Advanced)

You can test the tRPC endpoint directly:

```bash
# Using curl (requires authentication)
curl -X POST http://localhost:3000/api/trpc/agentic.generateResponse \
  -H "Content-Type: application/json" \
  -d '{
    "centerCoordId": "your-coord-id",
    "messages": [
      {"id": "1", "type": "user", "content": "Hello, test sandbox mode"}
    ],
    "model": "claude-haiku-4-5-20251001"
  }'
```

## Step 6: Verify Sandbox Behavior

Check the logs for these indicators:

### ✅ Success Indicators:
```bash
✅ "Initializing Vercel Sandbox"
✅ "Vercel Sandbox initialized successfully"
✅ No error messages
✅ Response received in ~15-20 seconds (first message)
✅ Subsequent messages ~10-15 seconds
```

### ❌ Common Issues:

**Issue: "Failed to initialize Vercel Sandbox"**
```bash
Error: Failed to initialize Vercel Sandbox. Ensure VERCEL_TOKEN is set.
```
**Fix:** Check that `VERCEL_TOKEN` is in your `.env` file and valid.

**Issue: "VERCEL_TOKEN is required"**
```bash
isConfigured() returned false
```
**Fix:** Add `VERCEL_TOKEN` to `.env` file.

**Issue: "Invalid token" or 401 errors**
```bash
Error: Unauthorized
```
**Fix:** Token expired or invalid. Create a new token at https://vercel.com/account/tokens

**Issue: Long initialization time (>30 seconds)**
```bash
[Still waiting for sandbox...]
```
**Explanation:** First-time sandbox creation can take 10-15 seconds. This is normal. Includes:
- Creating microVM (~2s)
- Installing Node.js dependencies (~5-8s)
- Starting agent (~3-5s)

## Step 7: Compare with Non-Sandbox Mode

To verify sandbox is actually being used, test without it:

1. Edit `.env`:
   ```bash
   USE_SANDBOX=false
   ```

2. Restart server: `pnpm dev`

3. Send another message

4. **Expected difference:**
   - With sandbox: Logs show "Initializing Vercel Sandbox"
   - Without sandbox: Direct SDK execution (no sandbox logs)
   - Without sandbox: Faster initial response (~5s vs ~15s)

5. Switch back to sandbox mode:
   ```bash
   USE_SANDBOX=true
   ```

## Step 8: Monitor Sandbox Usage (Optional)

### Local Monitoring

Check logs for timing:
```bash
# In your terminal, you'll see:
[agentic] Initializing Vercel Sandbox { hasVercelToken: true }
[timestamp] Sandbox created in XXXXms
[agentic] Vercel Sandbox initialized successfully
```

### Vercel Dashboard Monitoring

1. Visit: https://vercel.com/dashboard
2. Go to "Analytics" or "Usage" (if available)
3. Look for "Sandbox" usage metrics
4. Note: Local development sandbox usage may or may not show up immediately

## Troubleshooting

### Environment Variables Not Loading

```bash
# Check if .env is being read
pnpm dev 2>&1 | grep "Loaded env"

# Should see: "info Loaded env from /path/to/hexframe/.env"
```

If not loading, ensure:
- `.env` is in project root
- No syntax errors in `.env` file
- Run `pnpm dev` from project root directory

### Sandbox Times Out

```bash
Error: Sandbox execution timeout
```

**Causes:**
- Network issues connecting to Vercel
- Sandbox quota exceeded
- Vercel service outage

**Fix:**
- Check internet connection
- Verify Vercel status: https://www.vercel-status.com/
- Try again in a few minutes

### TypeScript Errors on Startup

```bash
Type error: ...
```

**Fix:**
```bash
# Run type checking
pnpm typecheck

# If errors, they should be unrelated to sandbox mode
# Check if they existed before
```

## Success Criteria ✅

You've successfully tested sandbox mode when:

1. ✅ Server starts without errors
2. ✅ Logs show "Initializing Vercel Sandbox"
3. ✅ Logs show "Vercel Sandbox initialized successfully"
4. ✅ Chat message receives a response
5. ✅ Response time is 15-20 seconds (includes sandbox setup)
6. ✅ No error messages in terminal
7. ✅ Can send multiple messages successfully

## Next Steps After Successful Local Test

1. **Test with Multiple Messages**
   - Send 3-5 messages in a row
   - Verify each creates a new sandbox (Phase 1 behavior)
   - Note the ~15s response time per message

2. **Document Your Experience**
   - Note any issues or delays
   - Track actual response times
   - Decide if Phase 2 optimization is needed

3. **Prepare for Production**
   - If local test succeeds, get production token
   - Add `VERCEL_TOKEN` to Vercel Dashboard
   - Set `USE_SANDBOX=true` in production env vars
   - Deploy!

## Cost Tracking During Testing

Local development sandbox usage **does count** toward your Vercel quota, but:
- Development is typically low-volume
- Testing 10-20 messages costs ~$0.01
- Don't worry about costs during testing
- Monitor after production deployment

## Additional Resources

- [Vercel Sandbox Docs](https://vercel.com/docs/vercel-sandbox)
- [Implementation Summary](../VERCEL_SANDBOX_INTEGRATION.md)
- [Optimization Roadmap](./VERCEL_SANDBOX_OPTIMIZATION_ROADMAP.md)

---

**Ready to test?** Start with Step 1! 🚀
