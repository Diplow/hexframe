# Plan: Route Regular Chat Messages to USER Tile Execution

## Goal
Unify chat message handling by routing regular messages through the same `executeTask` flow as @-mentions, targeting the user's USER tile. This eliminates the legacy `generateResponse` endpoint.

## Current Flow (To Be Replaced)

```
User sends regular message
  ↓
chatInputService.sendMessage() → dispatches user_message event
  ↓
useAIChatIntegration detects new user message
  ↓
sendToAI(message) → generateResponseMutation
  ↓
agentic.generateResponse endpoint (uses centerCoordId context)
  ↓
Response added to chat
```

## Target Flow

```
User sends regular message
  ↓
chatInputService.sendMessage() → dispatches user_message event
  ↓
useAIChatIntegration detects new user message
  ↓
executeTask(userTileCoordId, message, discussion)
  ↓
SSE stream via /api/stream/execute-task
  ↓
USER tile template renders with <discussion> section
  ↓
Response streamed to chat
```

## Implementation Steps

### Step 1: Get User's USER Tile Coordinates

**File:** `src/app/map/Chat/_hooks/useAIChatIntegration.ts`

Add a hook or utility to get the current user's USER tile coordId:

```typescript
// The USER tile is always at the root: userId,groupId (no path)
// Format: "{userId},0" where 0 is the default groupId

// Option A: Get from auth session
const { data: session } = authClient.useSession()
const userTileCoordId = session?.user?.id ? `${session.user.id},0` : null

// Option B: Create a dedicated hook
function useUserTileCoordId(): string | null {
  const { data: session } = authClient.useSession()
  if (!session?.user?.id) return null
  return `${session.user.id},0`  // userId,groupId with empty path
}
```

### Step 2: Modify useAIChatIntegration to Use executeTask

**File:** `src/app/map/Chat/_hooks/useAIChatIntegration.ts`

Current implementation calls `sendToAI(lastMessage.content)` when detecting a new user message.

**Changes:**
1. Import `useStreamingTaskExecution` (or use the existing one from context)
2. Get user's USER tile coordId
3. Replace `sendToAI` call with `executeTask(userTileCoordId, message, discussion)`
4. Get `discussion` from chat messages (format existing messages)

```typescript
// Before:
sendToAI(lastMessage.content)

// After:
const discussion = formatDiscussion(messages)
executeTask(userTileCoordId, lastMessage.content, discussion)
```

### Step 3: Pass executeTask to useAIChatIntegration

**File:** `src/app/map/Chat/ChatContainer.tsx` (or wherever useAIChatIntegration is called)

The `executeTask` function from `useStreamingTaskExecution` needs to be accessible in `useAIChatIntegration`.

Options:
- Pass it as a prop/option to `useAIChatIntegration`
- Lift `useStreamingTaskExecution` to a parent component
- Create a shared context for task execution

### Step 4: Create formatDiscussion Utility

**File:** `src/app/map/Chat/_hooks/_discussion-formatter.ts` (new file)

Extract the discussion formatting logic (already exists in `input.tsx`) to a reusable utility:

```typescript
import type { Message } from '~/app/map/Chat/_state/_events'

export function formatDiscussion(messages: Message[]): string | undefined {
  if (messages.length === 0) return undefined

  const formatted = messages.map(msg => {
    const actorLabel = msg.actor === 'user' ? 'User'
      : msg.actor === 'assistant' ? 'Assistant'
      : 'System'
    return `[${actorLabel}]: ${msg.content}`
  })

  return formatted.join('\n\n')
}
```

### Step 5: Remove generateResponse Endpoint

**File:** `src/server/api/routers/agentic/agentic.ts`

Once regular messages use `executeTask`, remove:
- `generateResponse` procedure (lines ~133-203)
- Related imports and types if unused elsewhere

### Step 6: Remove useAIChat Hook

**File:** `src/app/map/Chat/_hooks/useAIChat.ts`

This hook manages the `generateResponse` mutation. Once not used:
- Delete the file
- Remove from `src/app/map/Chat/_hooks/index.ts` exports
- Update any remaining references

### Step 7: Clean Up useAIChatIntegration

**File:** `src/app/map/Chat/_hooks/useAIChatIntegration.ts`

Remove:
- `sendToAI` function/callback
- `useAIChat` import and usage
- Any logic related to the old `generateResponse` flow

### Step 8: Update Tests

**Files:**
- `src/app/map/Chat/_hooks/__tests__/useAIChat.test.ts` - Delete
- `src/app/map/Chat/_hooks/__tests__/useAIChatIntegration.test.ts` - Update for new flow
- Any integration tests using `generateResponse`

---

## Key Files to Modify

| File | Action |
|------|--------|
| `src/app/map/Chat/_hooks/useAIChatIntegration.ts` | Refactor to use executeTask |
| `src/app/map/Chat/_hooks/_discussion-formatter.ts` | Create (extract from input.tsx) |
| `src/app/map/Chat/Input/input.tsx` | Use shared formatDiscussion |
| `src/server/api/routers/agentic/agentic.ts` | Remove generateResponse |
| `src/app/map/Chat/_hooks/useAIChat.ts` | Delete |
| `src/app/map/Chat/_hooks/index.ts` | Update exports |

## Key Files to Delete

- `src/app/map/Chat/_hooks/useAIChat.ts`
- `src/app/map/Chat/_hooks/__tests__/useAIChat.test.ts`

## Verification Checklist

- [ ] Regular messages trigger executeTask on USER tile
- [ ] Discussion section appears in USER tile prompts
- [ ] Streaming works correctly for regular messages
- [ ] @-mention flow still works unchanged
- [ ] generateResponse endpoint removed
- [ ] No TypeScript errors
- [ ] All tests pass
- [ ] ESLint passes

## Notes

- The USER tile template already supports `<discussion>` section (implemented earlier)
- The streaming infrastructure is already in place via `useStreamingTaskExecution`
- The `executeTask` signature already supports `discussion` parameter
- User authentication is required for both flows, so no auth changes needed
