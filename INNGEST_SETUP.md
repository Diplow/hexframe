# Inngest Setup Guide for Hexframe

## Overview
Inngest has been integrated to handle long-running LLM requests that would otherwise timeout on Vercel. It provides automatic queuing, retries, and monitoring for AI generation tasks.

## How It Works

### Architecture
1. **Quick Models** (< 5s response) → Direct calls (no queue)
   - gpt-4o-mini, gpt-3.5-turbo, claude-3-haiku, etc.

2. **Slow Models** (> 30s response) → Queued via Inngest
   - deepseek-r1, o1-preview, claude-3-opus, etc.

3. **Automatic Decision**: The system automatically determines whether to queue based on:
   - Model type (reasoning models always queued)
   - Context size (>4k tokens get queued)

## Setup Instructions

### 1. Create Inngest Account
1. Sign up at [app.inngest.com](https://app.inngest.com)
2. Create a new app called "hexframe"
3. Get your keys from the dashboard

### 2. Set Environment Variables

#### Local Development (.env.local)
```bash
# Inngest Configuration (optional for local dev)
INNGEST_EVENT_KEY=your_event_key
INNGEST_SIGNING_KEY=your_signing_key
USE_QUEUE=false  # Set to true to test queuing locally
```

#### Production (Vercel Dashboard)
```bash
# Required for production
INNGEST_EVENT_KEY=your_production_event_key
INNGEST_SIGNING_KEY=your_production_signing_key
USE_QUEUE=true  # Always use queue in production
```

### 3. Apply Database Migration
```bash
# Run the migration to create the llm_job_results table
pnpm db:push  # For development
# OR
pnpm db:migrate  # For production
```

### 4. Deploy to Vercel
```bash
git add .
git commit -m "feat: add Inngest for LLM request queuing"
git push
```

### 5. Connect Inngest to Your App
1. Go to your Inngest dashboard
2. Add your app's webhook URL: `https://hexframe.ai/api/inngest`
3. Inngest will automatically discover your functions

## Testing

### Local Testing (without Inngest)
```bash
# Set USE_QUEUE=false in .env.local
pnpm dev
# All requests will use direct calls
```

### Local Testing (with Inngest Dev Server)
```bash
# Install Inngest CLI
npm install -g inngest-cli

# Start Inngest dev server
inngest dev

# In another terminal, start your app
USE_QUEUE=true pnpm dev

# Your app will connect to local Inngest
```

### Production Testing
1. Deploy to Vercel
2. Check Inngest dashboard for function registration
3. Send a chat message with DeepSeek R1 model
4. Monitor in Inngest dashboard:
   - See job queued
   - Watch retry attempts if needed
   - View execution timeline

## Monitoring

### Inngest Dashboard Shows:
- **Function Runs**: All LLM generation attempts
- **Queue Depth**: How many jobs are waiting
- **Execution Time**: How long each model takes
- **Retry Attempts**: Failed requests and retries
- **Rate Limiting**: Per-user throttling

### Database Monitoring
```sql
-- Check pending jobs
SELECT * FROM llm_job_results WHERE status = 'pending';

-- Check failed jobs
SELECT * FROM llm_job_results WHERE status = 'failed';

-- User job history
SELECT * FROM llm_job_results WHERE user_id = 'xxx' ORDER BY created_at DESC;
```

## Troubleshooting

### Issue: Jobs not being processed
**Solution**: Check Inngest dashboard for errors, verify API keys are set

### Issue: Timeouts still occurring
**Solution**: Ensure USE_QUEUE=true in production, check Vercel function timeout is 60s

### Issue: Jobs stuck in pending
**Solution**: Check OpenRouter API key is valid, check Inngest function logs

### Issue: Rate limiting too aggressive
**Solution**: Adjust throttle limits in `functions.ts`:
```typescript
throttle: {
  limit: 10,  // Increase this
  period: '1m',
  key: 'event.data.userId'
}
```

## Cost Optimization

### Inngest Pricing
- **Free Tier**: 25,000 function runs/month
- **Pro**: $30/month for 150,000 runs
- Most users will stay within free tier

### Tips to Stay in Free Tier:
1. Use quick models when possible
2. Implement client-side caching
3. Batch similar requests
4. Set appropriate max tokens

## Rollback Plan

If you need to disable Inngest immediately:

1. **Quick Disable** (no code changes):
   ```bash
   # In Vercel Dashboard, set:
   USE_QUEUE=false
   ```
   All requests will use direct calls (may timeout)

2. **Full Rollback**:
   ```bash
   git revert [commit-hash]
   git push
   ```

## Advanced Configuration

### Custom Model Classification
Edit `/src/lib/domains/agentic/repositories/queued-llm.repository.ts`:
```typescript
const QUICK_MODELS = [
  // Add your quick models here
]

const SLOW_MODELS = [
  // Add your slow models here
]
```

### Adjust Queue Thresholds
```typescript
// Queue if large context (adjust threshold)
if (estimatedTokens && estimatedTokens > 4000) {
  return true
}
```

## Benefits

1. **No More Timeouts**: Long AI requests complete successfully
2. **Better UX**: Users see queue status and can cancel
3. **Automatic Retries**: Failed requests retry automatically
4. **Rate Limiting**: Prevents API abuse per user
5. **Observability**: Full visibility into AI operations
6. **Cost Control**: Throttling prevents runaway costs

## Next Steps

1. Monitor usage in Inngest dashboard
2. Adjust rate limits based on usage patterns
3. Consider implementing priority queues for paid users
4. Add webhook notifications for completed jobs