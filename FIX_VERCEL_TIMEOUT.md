# Fixing Vercel Timeout Error for AI Chat

## The Problem
AI generation requests are timing out after 30 seconds on Vercel with the error:
```
/services/api/trpc/agentic.generateResponse
Vercel Runtime Timeout Error: Task timed out after 30 seconds
```

## Root Cause
- AI model responses (especially reasoning models like DeepSeek R1) can take 30-60+ seconds
- Vercel has function timeout limits:
  - **Hobby Plan**: 10 seconds max
  - **Pro Plan**: 60 seconds max (current setting: 30s)
  - **Enterprise**: 300 seconds max

## Solutions

### Solution 1: Increase Timeout (Pro Plan Only)
**Status**: Already implemented in `vercel.json` - increased to 60 seconds

This gives more time but still might timeout for complex requests.

### Solution 2: Use Faster Models
Switch from reasoning models to faster models:
- Instead of `deepseek/deepseek-r1-0528` (reasoning model, slow)
- Use `deepseek/deepseek-chat` or `gpt-4o-mini` (faster)

### Solution 3: Implement Streaming (Recommended)
Streaming keeps the connection alive and provides better UX:

1. **Server-side**: Use OpenRouter's streaming API
2. **tRPC**: Use subscription or Server-Sent Events
3. **Client**: Show partial responses as they arrive

### Solution 4: Background Jobs + Polling
For complex, long-running tasks:
1. Start generation job, return job ID immediately
2. Client polls for completion
3. Store results in database

### Solution 5: Edge Functions
Move AI calls to Vercel Edge Functions (300 second timeout):
- Create `/app/api/ai/route.ts` as an edge function
- Call OpenRouter directly from edge

## Immediate Workaround

### For Production (if on Pro plan):
The timeout has been increased to 60 seconds in `vercel.json`.

### For Testing:
1. Use faster models for testing
2. Keep prompts shorter
3. Reduce max tokens

### For Hobby Plan:
You MUST either:
1. Upgrade to Pro plan (allows 60 second functions)
2. Implement streaming (works within 10 seconds)
3. Use edge functions

## Testing the Fix

1. **Deploy to Vercel**:
   ```bash
   git add vercel.json
   git commit -m "fix: increase function timeout to 60 seconds for AI generation"
   git push
   ```

2. **Test with a simple prompt first**:
   - Try: "Hello, what is 2+2?"
   - This should respond quickly

3. **Then test with complex prompts**:
   - If it still times out at 60 seconds, implement streaming

## Long-term Solution

Implement streaming for better UX and reliability:
- No timeout issues
- Users see progress
- Better perceived performance
- Works on all Vercel plans