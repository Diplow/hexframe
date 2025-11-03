# Vercel Sandbox Optimization Roadmap

## Current Implementation Analysis

### How It Works Now (Phase 1) ✅

**What happens on every single chat message:**

1. ❌ Creates a **NEW** `ClaudeAgentSDKSandboxRepository` instance
2. ❌ Creates a **NEW** Vercel Sandbox microVM
3. ❌ Installs Claude Agent SDK fresh (`npm install @anthropic-ai/claude-agent-sdk`)
4. ✅ Executes the agent query
5. ❌ Destroys the sandbox when serverless function returns
6. **Next message from same user?** Repeat steps 1-5

**Key Characteristics:**
- ✅ **Works reliably** - No persistent state issues
- ❌ **Inefficient** - Recreates everything per message
- ❌ **No session continuity** - Each message is isolated
- ✅ **Simple** - No lifecycle management needed

### Current Cost Analysis

**Per Message Breakdown:**
```
Sandbox initialization:  ~2 seconds
npm install:            ~5 seconds
Agent execution:        ~10 seconds
────────────────────────────────
Total per message:      ~17 seconds
```

**Typical User Session (30 minutes, 30 messages):**
```
30 messages × 17 seconds × 2 vCPUs = 1,020 vCPU-seconds

Cost calculation:
1,020 vCPU-seconds × $0.00001/vCPU-second = $0.0102 per session

Per user costs:
- Per session: ~$0.01
- Per day (30 min avg): ~$0.01
- Per month: ~$0.30
```

**Efficiency Analysis:**
- ⚠️ **12 seconds of waste** (initialization + install) per message
- ⚠️ **70% overhead** - Only 5 seconds of 17 is actual work
- ⚠️ **30x multiplier** - If user sends 30 messages, we waste 6 minutes on setup

### When Current Implementation is Acceptable

- ✅ **Initial launch** - Test production behavior with real users
- ✅ **Low traffic** - < 100 active users per day
- ✅ **Budget allows** - $0.30/user/month is acceptable
- ✅ **Debugging** - Isolated executions make errors easier to trace

### When You Need to Optimize (Phase 2 Triggers)

- 🚨 **Cost threshold** - Sandbox costs exceed $100/month
- 🚨 **User experience** - Users complain about 7-second initialization delay
- 🚨 **Scale** - 500+ active users per day
- 🚨 **Feature need** - Want persistent agent memory across messages

---

## Phase 2: Persistent Sandbox Pool (10x Cost Reduction)

### Vision

Instead of creating a new sandbox per message, maintain a pool of long-lived sandboxes that serve multiple messages.

### Architecture

```typescript
┌──────────────────────────────────────────────────────┐
│ SandboxPoolService (Singleton)                       │
│                                                       │
│  userSandboxes: Map<userId, {                       │
│    sandbox: Sandbox,                                 │
│    lastUsed: Date,                                   │
│    isReady: boolean                                  │
│  }>                                                   │
│                                                       │
│  • getSandboxForUser(userId)                         │
│  • releaseIdleSandboxes() // Cleanup after 30min    │
│  • warmupSandbox(userId) // Preemptive creation     │
└──────────────────────────────────────────────────────┘
```

### Implementation Sketch

```typescript
// File: src/lib/domains/agentic/infrastructure/sandbox-pool.service.ts

interface UserSandbox {
  sandbox: Awaited<ReturnType<typeof Sandbox.create>>
  lastUsed: Date
  isReady: boolean
  userId: string
}

export class SandboxPoolService {
  private userSandboxes = new Map<string, UserSandbox>()
  private readonly IDLE_TIMEOUT = 30 * 60 * 1000 // 30 minutes
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Start background cleanup task
    this.startCleanupTask()
  }

  /**
   * Get or create a sandbox for a user
   * Reuses existing sandbox if available
   */
  async getSandboxForUser(userId: string): Promise<UserSandbox['sandbox']> {
    const existing = this.userSandboxes.get(userId)

    if (existing && existing.isReady) {
      loggers.agentic('Reusing existing sandbox for user', { userId })
      existing.lastUsed = new Date()
      return existing.sandbox
    }

    loggers.agentic('Creating new sandbox for user', { userId })

    const sandbox = await Sandbox.create({
      runtime: 'node22',
      timeout: ms('30m'), // Keep alive for 30 minutes of inactivity
      resources: { vcpus: 2 }
    })

    // Install Claude Agent SDK once
    await sandbox.runCommand({
      cmd: 'npm',
      args: ['install', '@anthropic-ai/claude-agent-sdk']
    })

    const userSandbox: UserSandbox = {
      sandbox,
      lastUsed: new Date(),
      isReady: true,
      userId
    }

    this.userSandboxes.set(userId, userSandbox)
    return sandbox
  }

  /**
   * Background task to cleanup idle sandboxes
   */
  private startCleanupTask() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleSandboxes()
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  /**
   * Remove sandboxes that haven't been used in 30 minutes
   */
  private async cleanupIdleSandboxes() {
    const now = Date.now()
    const entriesToRemove: string[] = []

    for (const [userId, userSandbox] of this.userSandboxes.entries()) {
      const idleTime = now - userSandbox.lastUsed.getTime()

      if (idleTime > this.IDLE_TIMEOUT) {
        loggers.agentic('Cleaning up idle sandbox', {
          userId,
          idleMinutes: Math.round(idleTime / 60000)
        })

        // Sandbox cleanup is automatic by Vercel
        // Just remove from our tracking
        entriesToRemove.push(userId)
      }
    }

    entriesToRemove.forEach(userId => this.userSandboxes.delete(userId))

    if (entriesToRemove.length > 0) {
      loggers.agentic('Sandbox cleanup complete', {
        removed: entriesToRemove.length,
        remaining: this.userSandboxes.size
      })
    }
  }

  /**
   * Get pool statistics for monitoring
   */
  getStats() {
    return {
      totalSandboxes: this.userSandboxes.size,
      readySandboxes: Array.from(this.userSandboxes.values())
        .filter(s => s.isReady).length,
      oldestSandboxAge: this.getOldestSandboxAge()
    }
  }

  private getOldestSandboxAge(): number | null {
    if (this.userSandboxes.size === 0) return null

    const oldest = Array.from(this.userSandboxes.values())
      .reduce((oldest, current) =>
        current.lastUsed < oldest.lastUsed ? current : oldest
      )

    return Date.now() - oldest.lastUsed.getTime()
  }

  /**
   * Cleanup on service shutdown
   */
  async shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.userSandboxes.clear()
  }
}

// Singleton instance
export const sandboxPool = new SandboxPoolService()
```

### Update Repository to Use Pool

```typescript
// File: src/lib/domains/agentic/repositories/claude-agent-sdk-sandbox.repository.ts

import { sandboxPool } from '~/lib/domains/agentic/infrastructure/sandbox-pool.service'

export class ClaudeAgentSDKSandboxRepository implements ILLMRepository {
  private readonly apiKey: string
  private readonly mcpApiKey?: string
  private readonly userId?: string

  constructor(apiKey: string, mcpApiKey?: string, userId?: string) {
    this.apiKey = apiKey
    this.mcpApiKey = mcpApiKey
    this.userId = userId
  }

  private async _getSandbox() {
    if (!this.userId) {
      throw this.createError('UNKNOWN', 'User ID required for sandbox pool')
    }

    // Get sandbox from pool (creates if needed, reuses if available)
    return await sandboxPool.getSandboxForUser(this.userId)
  }

  private async _executeInSandbox(
    userPrompt: string,
    systemPrompt: string | undefined,
    model: string,
    streaming: boolean
  ): Promise<{ content: string; usage: LLMResponse['usage'] }> {
    // Get or reuse sandbox
    const sandbox = await this._getSandbox()

    // Rest of execution code stays the same...
    // No more initialization or npm install per request!
  }
}
```

### Expected Improvements

**Cost Reduction:**
```
Before (Phase 1):
30 messages × 17 seconds × 2 vCPUs = 1,020 vCPU-seconds
Cost: $0.0102 per session

After (Phase 2):
Initialization (once): 7 seconds × 2 vCPUs = 14 vCPU-seconds
30 messages × 10 seconds × 2 vCPUs = 600 vCPU-seconds
Total: 614 vCPU-seconds
Cost: $0.00614 per session

Savings: 40% reduction per session
Monthly: $0.30 → $0.18 per user
```

**Performance Improvement:**
```
Before: 17 seconds per message (7s setup + 10s execution)
After:  10 seconds per message (first message has 17s, rest have 10s)

User experience: 41% faster response time
```

**Scalability:**
```
Before: N messages = N sandboxes
After:  N messages = 1 sandbox (per user)

At 1000 active users:
- Before: 1000 sandboxes created per concurrent batch
- After: 1000 sandboxes total (one per user, reused)
```

---

## Phase 3: Persistent Agent Sessions (Future Vision)

### Vision

Maintain Claude Agent SDK sessions across multiple messages, enabling true agentic memory and context.

### Key Concept

Currently, each message creates a fresh Claude Agent SDK execution. The agent doesn't "remember" previous tool uses or intermediate reasoning.

**With persistent sessions:**
```
User: "Create a new tile about AI"
Agent: *uses createTile tool* ✅ Tile created

User: "Now add a subtile"
Agent: *remembers previous tile ID, uses createTile with parent context* ✅ Subtile added

User: "What did I just create?"
Agent: "You created a tile about AI and added a subtile underneath it" ✅ Has memory
```

### Implementation Sketch

```typescript
// Extend sandbox pool to track agent sessions
interface UserSandbox {
  sandbox: Sandbox
  agentSession: AgentSession | null // Persistent Claude session
  conversationHistory: Message[]
  lastUsed: Date
  isReady: boolean
  userId: string
}

class AgentSession {
  private sessionId: string
  private sandbox: Sandbox
  private toolCache: Map<string, unknown> // Cache tool results

  async continueConversation(newMessage: string) {
    // Send to existing agent session, maintains context
  }

  async reset() {
    // Start fresh session for same sandbox
  }
}
```

### Benefits

- ✅ **True agentic behavior** - Agent remembers previous actions
- ✅ **Better tool use** - Can reference previous tool results
- ✅ **Conversation continuity** - Natural follow-up questions
- ✅ **Same cost as Phase 2** - No additional sandbox overhead

### Challenges

- ⚠️ **Session state management** - Need to handle session lifecycle
- ⚠️ **Error recovery** - What if agent session crashes?
- ⚠️ **Memory growth** - Long conversations accumulate tokens
- ⚠️ **User expectations** - Users need to understand session boundaries

### When to Build Phase 3

- ✅ Phase 2 is stable and deployed
- ✅ Users are requesting better agent memory
- ✅ Product vision includes multi-turn agentic workflows
- ✅ Have monitoring and debugging tools for agent sessions

---

## Implementation Timeline

### Phase 1: Current State ✅
- **Status**: Implemented and working
- **Timeline**: Complete
- **Cost**: ~$0.30/user/month
- **Decision**: Safe to deploy to production now

### Phase 2: Persistent Sandbox Pool 🎯
- **When to start**: After initial production testing (1-2 weeks)
- **Triggers**:
  - Sandbox costs exceed $100/month, OR
  - User complaints about slow response time, OR
  - 500+ daily active users
- **Effort**: 2-3 days of development
- **Expected savings**: 40% cost reduction
- **Files to create**:
  - `src/lib/domains/agentic/infrastructure/sandbox-pool.service.ts`
  - Update `claude-agent-sdk-sandbox.repository.ts`
  - Add monitoring endpoint for pool stats

### Phase 3: Persistent Agent Sessions 🔮
- **When to start**: After Phase 2 is stable (1-2 months)
- **Triggers**:
  - Product needs multi-turn agentic workflows, OR
  - Users request better agent memory, OR
  - Competitive feature requirement
- **Effort**: 1-2 weeks of development
- **Expected benefit**: Better user experience, same cost as Phase 2
- **Prerequisites**:
  - Phase 2 stable
  - Session management infrastructure
  - Agent debugging tools

---

## Monitoring & Metrics

### What to Track Now (Phase 1)

Add to Vercel Analytics or custom logging:

```typescript
// Track sandbox metrics
{
  sandboxInitTime: number,      // Time to create sandbox
  npmInstallTime: number,        // Time to install dependencies
  agentExecutionTime: number,    // Actual query time
  totalRequestTime: number,      // End-to-end
  userId: string,
  timestamp: Date
}
```

### Cost Alerts to Set Up

1. **Vercel Dashboard** → Sandbox Usage → Set budget alert at $50/month
2. **Custom metric**: Track `vCPU-seconds per user` weekly
3. **Threshold**: Alert if sandbox costs > $100/month (trigger for Phase 2)

### Phase 2 Success Metrics

After implementing persistent sandboxes, measure:

```typescript
{
  sandboxReuseRate: number,      // % of requests that reuse sandbox
  avgInitTimePerUser: number,    // Should approach 7s / messages_per_session
  avgResponseTime: number,       // Should decrease by 40%
  activeSandboxes: number,       // Pool size over time
  idleSandboxCleanups: number    // Cleanup efficiency
}
```

**Success criteria:**
- ✅ Sandbox reuse rate > 80%
- ✅ Avg response time < 12 seconds (down from 17s)
- ✅ Cost per user < $0.20/month (down from $0.30)
- ✅ Pool size stays below 2x concurrent users

---

## Decision Framework

### Should You Deploy Phase 1 to Production Now?

**Yes, if:**
- ✅ Budget allows ~$0.30/user/month for sandbox costs
- ✅ User base is < 500 daily active users
- ✅ You can commit to Phase 2 within 1-2 weeks if costs spike
- ✅ User experience of 17s initial response is acceptable

**Wait and build Phase 2 first, if:**
- ❌ Expected traffic > 1000 daily active users immediately
- ❌ Budget constraint < $0.20/user/month
- ❌ User experience requirement < 12s response time
- ❌ You have 2-3 days to implement Phase 2 before launch

### Should You Build Phase 2 Now (Before Production)?

**Yes, if:**
- ✅ You have 2-3 days of dev time available
- ✅ Expected production traffic > 1000 DAU
- ✅ Want to minimize technical debt
- ✅ Cost optimization is a priority

**No, build it later if:**
- ✅ Want to test Phase 1 behavior in production first
- ✅ Uncertain about actual usage patterns
- ✅ Need to launch quickly (< 1 week)
- ✅ Budget allows Phase 1 costs for initial testing

---

## Cost Comparison Summary

| Metric | Phase 1 (Current) | Phase 2 (Pooled) | Phase 3 (Persistent) |
|--------|-------------------|------------------|---------------------|
| **Setup per session** | 7s × 30 msgs = 210s | 7s × 1 = 7s | 7s × 1 = 7s |
| **Execution per msg** | 10s | 10s | 10s |
| **Total vCPU-seconds** | 1,020 | 614 | 614 |
| **Cost per session** | $0.010 | $0.006 | $0.006 |
| **Cost per user/month** | $0.30 | $0.18 | $0.18 |
| **Response time** | 17s | 10s* | 10s* |
| **Agent memory** | ❌ | ❌ | ✅ |
| **Implementation** | ✅ Done | 🎯 2-3 days | 🔮 1-2 weeks |

\* First message in session still takes 17s, subsequent messages 10s

---

## Recommended Action Plan

### Week 0 (Now): Deploy Phase 1
- ✅ Current implementation is ready
- ✅ Set up cost monitoring in Vercel
- ✅ Set budget alert at $100/month
- ✅ Deploy to production with `USE_SANDBOX=true`

### Week 1-2: Monitor & Gather Data
- 📊 Track actual usage patterns
- 📊 Measure real costs per user
- 📊 Get user feedback on response times
- 📊 Identify optimization needs

### Week 2-3: Build Phase 2 (If Triggered)
- 🎯 Implement `SandboxPoolService`
- 🎯 Update repository to use pool
- 🎯 Add monitoring dashboard
- 🎯 Test in staging with production traffic patterns
- 🎯 Deploy and measure improvements

### Month 2+: Consider Phase 3 (If Needed)
- 🔮 Evaluate product need for persistent agent sessions
- 🔮 Design session management architecture
- 🔮 Implement and test
- 🔮 Roll out as product feature

---

## Questions & Answers

### Q: Can I skip Phase 1 and go straight to Phase 2?
**A:** Yes! Phase 2 is strictly better. Only reason to do Phase 1 first is:
- Learn actual production behavior before optimizing
- Faster time to market (0 days vs 2-3 days)
- Validate that Vercel Sandbox works as expected

### Q: What if a user has multiple concurrent chat sessions?
**A:** Phase 1 handles this fine (new sandbox per session). Phase 2 needs enhancement:
- Track `Map<userId + sessionId, Sandbox>` instead of just `userId`
- Or use a shared sandbox pool with isolated agent sessions

### Q: How do I know when to move from Phase 2 to Phase 3?
**A:** Phase 3 is a **product feature**, not just optimization. Build it when:
- Users ask for "remember what we discussed"
- Product roadmap includes multi-turn workflows
- You want agents to maintain context across messages

### Q: What happens if sandbox pool grows too large?
**A:** Set maximum pool size:
```typescript
const MAX_POOL_SIZE = 100 // Limit to 100 concurrent user sandboxes
if (this.userSandboxes.size >= MAX_POOL_SIZE) {
  // Evict least recently used sandbox
  this.evictLRUSandbox()
}
```

### Q: Can multiple users share one sandbox?
**A:** Technically yes (Vercel Sandbox has isolation), but:
- ❌ Complicates agent session management
- ❌ One user's error could affect others
- ✅ Better to keep one sandbox per user (Phase 2) for now

---

## Additional Resources

- [Vercel Sandbox Pricing](https://vercel.com/docs/vercel-sandbox#pricing)
- [Claude Agent SDK Session Management](https://github.com/anthropics/claude-agent-sdk) (if available)
- [Setup Guide](./VERCEL_SANDBOX_SETUP.md)
- [Implementation Summary](../VERCEL_SANDBOX_INTEGRATION.md)

---

**Last Updated**: 2025-11-03
**Status**: Phase 1 Complete ✅ | Phase 2 Planned 🎯 | Phase 3 Future 🔮
