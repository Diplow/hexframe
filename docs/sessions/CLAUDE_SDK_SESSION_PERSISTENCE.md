# Claude SDK Session Persistence - Implementation Notes

## Current State (as of 2025-12-19)

### What's Working
1. **Vercel Sandbox Persistence** - Sandboxes are reused across requests via Redis
   - Session manager stores `sandboxId` in Upstash Redis
   - On subsequent requests, reconnects to existing sandbox via `Sandbox.get()`
   - SDK is installed once per sandbox, not per request
   - See: `src/lib/domains/agentic/services/sandbox-session/`

2. **Environment Setup**
   - `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` configured
   - Logs confirm sandbox reuse is working

### What's NOT Working
**Claude conversation persistence** - Each `query()` call starts a fresh conversation. The agent doesn't remember previous messages.

## Root Cause

In `src/lib/domains/agentic/repositories/claude-agent-sdk-sandbox.repository.ts`, we call:

```typescript
queryResult = query({
  prompt: userPrompt,
  options: {
    model: model,
    // ... other options
    // MISSING: resume: sessionId  <-- This would enable persistence!
  }
})
```

The Claude Agent SDK returns a `session_id` in responses, which can be passed back via `resume` option to continue the conversation.

## Solution: Use SDK Session Resumption

### V1 API (Current)
```typescript
// First message - capture session_id
const q = query({ prompt: 'Hello!', options: { ... } })
let sessionId: string
for await (const msg of q) {
  sessionId = msg.session_id  // Store this in Redis!
}

// Subsequent messages - resume session
const resumed = query({
  prompt: 'Continue...',
  options: {
    resume: sessionId  // <-- Key addition
  }
})
```

### V2 API (Preview - cleaner)
```typescript
import { unstable_v2_createSession, unstable_v2_resumeSession } from '@anthropic-ai/claude-agent-sdk'

// First message
const session = unstable_v2_createSession({ model: '...' })
await session.send('Hello!')
const sessionId = (await session.receive().next()).value.session_id

// Resume later
const resumed = unstable_v2_resumeSession(sessionId, { model: '...' })
await resumed.send('Continue...')
```

## Implementation Plan

### 1. Extend Redis Session Store
Store Claude session ID alongside sandbox ID:

```typescript
interface SandboxSession {
  sandboxId: string
  claudeSessionId?: string  // <-- Add this
  userId: string
  // ... existing fields
}
```

### 2. Update Repository to Capture Session ID
In `_executeInSandbox()`, parse `session_id` from SDK response and return it.

### 3. Update Repository to Resume Sessions
Accept optional `claudeSessionId` parameter and pass as `resume` option.

### 4. Wire Through Service Layer
- `AgenticService` passes session ID through the flow
- Session manager stores/retrieves Claude session ID from Redis

## Files to Modify

1. `src/lib/domains/agentic/services/sandbox-session/sandbox-session.types.ts` - Add `claudeSessionId`
2. `src/lib/domains/agentic/services/sandbox-session/sandbox-session-manager.service.ts` - Handle Claude session
3. `src/lib/domains/agentic/repositories/claude-agent-sdk-sandbox.repository.ts` - Capture and use session ID
4. `src/lib/domains/agentic/services/agentic.service.ts` - Pass session through

## Mental Model

```
User Session (better-auth)
    └── Sandbox Session (Vercel sandbox - reused for speed)
            └── Claude Session (conversation memory - this is what we need to add)
```

The user's mental model: "Delegate conversation handling to Claude, just like Claude Code does."

## References

- [TypeScript SDK V2 Preview](https://platform.claude.com/docs/en/agent-sdk/typescript-v2-preview)
- [Session Management Docs](https://docs.claude.com/en/api/agent-sdk/sessions)
- Current implementation: `src/lib/domains/agentic/repositories/claude-agent-sdk-sandbox.repository.ts`
