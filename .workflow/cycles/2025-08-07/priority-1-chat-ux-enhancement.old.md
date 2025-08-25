# Priority 1: Chat UX Enhancement

**Branch**: `priority-1-chat-ux-enhancement`
**Tags**: #enhancement #design #tech #high #chat
**Created**: 2025-08-16
**Status**: Issue Documentation

## Problem Statement

### User Impact
- **Who is affected?**: All Hexframe users interacting with the AI chat
- **What can't they do?**: 
  - Can't easily scan conversation history due to poor message formatting
  - Can't tell when AI is thinking or processing their request
  - Experience jarring transitions when AI responds
- **How critical is this to their workflow?**: Medium-High - The chat is the primary interface for AI interaction, poor UX undermines the entire "living systems" experience
- **Workarounds**: None - users must tolerate the current experience

### Current Experience Issues

#### 1. Awkward Message Formatting
**What users experience:**
- Excessive vertical space between message elements
- Confusing line breaks after timestamps
- Inconsistent visual hierarchy making conversations hard to scan
- "System:", "HexFrame:", "You:" labels feel clunky and unprofessional

**Impact:** Users struggle to follow conversation flow, reducing engagement with AI features

#### 2. No AI Processing Feedback
**What users experience:**
- Complete silence after sending a message to AI
- No indication that their request was received
- No visibility into what the AI is thinking or doing
- Anxiety about whether the system is working

**Impact:** Users may repeatedly send messages or abandon the feature thinking it's broken

#### 3. Jarring Response Appearance
**What users experience:**
- AI widget suddenly disappears
- Message appears abruptly with no transition
- No visual connection between "thinking" and "response" states
- Feels mechanical rather than conversational

**Impact:** Breaks the illusion of intelligent interaction, makes AI feel like a basic chatbot

## Reproduction Steps

### Message Formatting Issue
1. Open any Hexframe map with chat
2. Send a message to the AI
3. Observe the awkward spacing after "You:" label
4. Note the line break before the actual message content
5. See how timestamps create visual clutter

### Missing Feedback Issue
1. Open any Hexframe map with chat
2. Type a complex question requiring AI processing
3. Press send
4. Observe: Nothing happens visually for 5-15 seconds
5. User has no idea if request was received or being processed

### Jarring Transition Issue
1. Open any Hexframe map with chat
2. Send any message to AI
3. Wait for response
4. Observe: AI widget instantly replaced by message
5. No smooth transition or visual continuity

## Success Criteria
- Users can easily scan conversation history
- Users always know when AI is processing
- AI interactions feel smooth and intelligent
- Chat interface feels professional and polished

## Reference Examples
- **Good message layout**: Slack's clean inline format
- **Good thinking feedback**: ChatGPT's "thinking" indicator
- **Good transitions**: Claude.ai's smooth message appearance

## Business Impact
- **User Engagement**: Poor chat UX reduces AI feature adoption
- **Perceived Intelligence**: Lack of feedback makes AI seem "dumb"
- **Professional Image**: Current implementation feels prototype-quality
- **Competitive Position**: Falls short of user expectations set by ChatGPT/Claude

## Context

*I am an AI assistant acting on behalf of @ulysse*

### Existing Documentation
- **Chat README**: `/src/app/map/Chat/README.md` - Comprehensive system documentation ✅
- **Architecture Doc**: `/src/app/map/Chat/ARCHITECTURE.md` - Detailed component structure ✅
- **Interface Definitions**: `/src/app/map/Chat/interface.ts` - Shared types and contracts ✅
- **Dependencies**: `/src/app/map/Chat/dependencies.json` - External dependency map ✅
- **Agentic Domain**: `/src/lib/domains/agentic/README.md` - AI integration documentation ✅
- **Documentation vs Reality**: Documentation is accurate but missing thinking tokens details 📝

### Domain Overview

#### Chat Subsystem
The Chat subsystem implements an **event-driven architecture** with clear interfaces:
- **Event Sourcing**: Immutable event log drives all state changes
- **Unified Timeline**: Chronological mixing of messages and widgets
- **Clean Interfaces**: Well-defined boundaries between subsystems
- **Reactive Updates**: Event-driven UI updates via React Context

#### Agentic Domain (Hexagonal Architecture)
The agentic domain follows proper **hexagonal architecture**:
- **Repository Layer**: OpenRouter and Queued LLM repositories implement common interface
- **Service Layer**: AgenticService orchestrates AI interactions
- **Infrastructure**: Inngest for async jobs, event bus for domain events
- **Port/Adapter Pattern**: Clear separation between domain logic and external services

### Key Components

#### Message Rendering Pipeline
- `ChatPanel.tsx`: Main entry point, provides context and handles isThinking state
- `UnifiedTimeline.tsx`: Orchestrates chronological display of all timeline items
- `MessageActorRenderer.tsx`: Renders messages with actor labels (User/System/Assistant)
- `MarkdownRenderer.tsx`: Processes content with ReactMarkdown + remarkGfm
- **Issue**: Basic prose styling with awkward line breaks after labels

#### AI Response System
- `AIResponseWidget/index.tsx`: Sophisticated 5-state widget (pending/processing/completed/failed/direct)
- `useAIChat.ts`: Handles AI request lifecycle and state management
- `useAIChatIntegration.ts`: Auto-sends non-command messages to AI
- **Issue**: Widget provides good feedback but transitions are jarring

#### Animation Infrastructure
- **Current**: Limited to Tailwind utilities (animate-pulse, animate-spin)
- **Custom**: Progress bar animation in AIResponseWidget
- **Missing**: No message entrance animations or smooth transitions
- **Missing**: No scroll animations (instant jump to bottom)

### Implementation Details

#### Current Message Formatting
```typescript
// From MessageActorRenderer.tsx
<div className="rounded-lg bg-white/10 p-3">
  <div className="mb-1 text-xs text-gray-500">
    {renderActor(message.actor)} • {formatTimestamp(message.timestamp)}
  </div>
  <MarkdownRenderer content={message.content} />
</div>
```
**Problems**: Line break after actor label, poor visual hierarchy

#### AI Thinking State
```typescript
// From ChatPanel.tsx line 45-49
{isThinking && (
  <div className="text-gray-500 text-sm animate-pulse">
    Thinking...
  </div>
)}
```
**Problems**: Basic text-only indicator, no token streaming capability

#### OpenRouter Integration (Agentic Domain)
```typescript
// From openrouter.repository.ts
async generateResponse(params: LLMRequestParams): Promise<LLMResponse> {
  const response = await fetch(`${this.baseUrl}/chat/completions`, {
    body: JSON.stringify({
      messages: params.messages,
      model: params.model,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      // MISSING: reasoning: true parameter for thinking tokens
    })
  })
  
  // Response processing
  return {
    content: choice.message.content,
    // MISSING: reasoning field from response
  }
}
```
**Critical Gap**: DeepSeek R1 model supports thinking tokens but they're not requested or captured

#### Model Routing
```typescript
// From agentic.service.ts
const slowModels = ['deepseek/deepseek-r1-0528', 'o1-preview', 'o1-mini']
// DeepSeek R1 is queued, making real-time thinking token display challenging
```
**Issue**: Reasoning models are queued, preventing real-time thinking token streaming

#### Backend Streaming Status
```typescript
// From agentic.ts line 148-169
generateStreamingResponse: publicProcedure
  .input(/* ... */)
  .mutation(async () => {
    throw new Error("Streaming not yet implemented");
  }),
```
**Problems**: Streaming endpoint exists but not implemented

### Dependencies and Integration

#### Internal Dependencies
- **Chat Subsystem**:
  - `_state/_reducers/events.reducer.ts` - Event-driven state management
  - `_state/_selectors/*.ts` - Derive UI state from events
  - `_hooks/*.ts` - Encapsulate chat logic and side effects
  - Canvas Integration: Shares context for AI interactions with map

- **Agentic Domain**:
  - `repositories/openrouter.repository.ts` - OpenRouter API client
  - `repositories/queued-llm.repository.ts` - Async job processing
  - `services/agentic.service.ts` - Main orchestration service
  - `infrastructure/inngest/` - Background job processing

#### External Consumers  
- **Map System**: Integrates chat for AI-powered map interactions
- **Widget System**: Displays various widgets in timeline
- **Command System**: Processes user commands via chat input
- **tRPC Router**: `/src/server/api/routers/agentic/agentic.ts` bridges frontend to domain

#### API Contracts
- **tRPC Endpoints**: 
  - `generateResponse` - Main AI endpoint (direct or queued)
  - `getJobStatus` - Poll for queued job status
  - `watchJobStatus` - Subscription for job updates
  - `generateStreamingResponse` - Not implemented yet

- **LLM Interfaces**:
  ```typescript
  interface LLMRequestParams {
    messages: Array<{role: string, content: string}>
    model: string
    temperature?: number
    maxTokens?: number
    // MISSING: reasoning?: boolean
  }
  
  interface LLMResponse {
    id: string
    model: string
    content: string
    usage: TokenUsage
    // MISSING: reasoning?: string
  }
  ```

#### Tech Stack
- **Frontend**: 
  - React 18 with hooks and context
  - ReactMarkdown + remarkGfm for content
  - Tailwind CSS for styling
  - Lucide React for icons
  - tRPC React Query for API calls

- **Backend**:
  - tRPC for type-safe API
  - Drizzle ORM + PostgreSQL for persistence
  - OpenRouter for LLM API access
  - Inngest for background job processing
  - Node.js fetch for HTTP requests

- **Missing Infrastructure**:
  - WebSocket/SSE for real-time streaming
  - Thinking token capture in OpenRouter integration
  - Streaming implementation in tRPC endpoint
  - Real-time thinking token display components

### Critical Findings

1. **Thinking Tokens Not Captured**: Despite using DeepSeek R1 (which supports reasoning), the OpenRouter repository doesn't request or process thinking tokens
2. **Queued Processing Blocks Streaming**: Reasoning models are queued for async processing, preventing real-time thinking display
3. **Streaming Infrastructure Incomplete**: While OpenRouter repository has streaming methods, the tRPC endpoint and UI aren't connected
4. **Architecture Well-Positioned**: The domain separation and clean interfaces make adding thinking tokens straightforward

## Solution

*I am an AI assistant acting on behalf of @ulysse*

### Solution 1: Minimal UI Enhancement (Quick Win)

**Overview**: Focus solely on UI/UX improvements without backend changes. Accept that thinking tokens won't be real-time for queued models.

**Implementation Path**:
1. **Message Layout Refactor**
   - Update `MessageActorRenderer.tsx` with Slack-style inline layout
   - Modify timestamp styling to be muted gray, no colons
   - Remove line breaks between actor labels and content

2. **Enhanced Thinking Feedback**
   - Improve `ChatPanel.tsx` thinking indicator with better visuals
   - Add Canvas scanning animation during AI processing
   - Create mock thinking phrases that rotate while waiting

3. **Smooth Transitions**
   - Add CSS transitions to `AIResponseWidget`
   - Implement color transitions (yellow→orange→green)
   - Add fade-in animations for messages

**Components Affected**:
- `/src/app/map/Chat/Timeline/MessageActorRenderer.tsx`
- `/src/app/map/Chat/ChatPanel.tsx`
- `/src/app/map/Chat/Timeline/Widgets/AIResponseWidget/index.tsx`
- `/src/app/map/Canvas/` (for scanning animations)

**Pros**:
- ✅ Quick implementation (1-2 days)
- ✅ No backend changes required
- ✅ Immediate UX improvements
- ✅ Low risk

**Cons**:
- ❌ No real thinking tokens
- ❌ Mock feedback isn't authentic
- ❌ Doesn't leverage DeepSeek R1's capabilities

### Solution 2: Full Streaming Implementation

**Overview**: Complete implementation with WebSocket/SSE streaming for real-time thinking tokens.

**Implementation Path**:
1. **Backend Streaming Infrastructure**
   - Implement WebSocket server for real-time streaming
   - Update OpenRouter repository to request/capture thinking tokens
   - Create new direct streaming path for reasoning models
   - Implement tRPC streaming endpoint

2. **Frontend Streaming Consumer**
   - Create WebSocket client in Chat subsystem
   - Build streaming token display component
   - Implement progressive message rendering

3. **UI/UX Improvements**
   - All improvements from Solution 1
   - Real thinking token display with formatting
   - Smooth transitions between thinking and response

**Components Affected**:
- `/src/lib/domains/agentic/repositories/openrouter.repository.ts` (thinking tokens)
- `/src/server/api/routers/agentic/agentic.ts` (streaming endpoint)
- `/src/server/websocket/` (new WebSocket server)
- `/src/app/map/Chat/_hooks/useStreamingChat.ts` (new)
- `/src/app/map/Chat/Timeline/ThinkingTokenDisplay.tsx` (new)
- All UI components from Solution 1

**Pros**:
- ✅ Full thinking token support
- ✅ Real-time authentic feedback
- ✅ Best possible UX
- ✅ Future-proof architecture

**Cons**:
- ❌ Complex implementation (5-7 days)
- ❌ Requires WebSocket infrastructure
- ❌ Still blocked for queued models
- ❌ Higher maintenance burden

### Solution 3: Hybrid Progressive Enhancement (Recommended)

**Overview**: Progressive implementation that delivers immediate value while building toward full solution.

**Phase 1: UI Polish + Thinking Token Capture (2 days)**
1. Implement all UI improvements from Solution 1
2. Update OpenRouter repository to request thinking tokens
3. Store thinking tokens in job results for queued models
4. Display stored thinking tokens when job completes

**Phase 2: Polling-Based Thinking Display (1-2 days)**
1. Enhance job status polling to include partial thinking tokens
2. Update `AIResponseWidget` to show progressive thinking
3. Add smooth transitions between thinking updates
4. Implement Canvas scanning coordinated with polling

**Phase 3: Direct Model Streaming (2-3 days)**
1. Implement SSE-based streaming for direct models
2. Route fast models through streaming path
3. Keep queued path for slow models with enhanced polling
4. Unify UI to handle both streaming and polling

**Components Affected**:
- **Phase 1**: 
  - UI components (MessageActorRenderer, ChatPanel, AIResponseWidget)
  - `openrouter.repository.ts` (add reasoning parameter)
  - `llm.repository.interface.ts` (extend types)

- **Phase 2**:
  - `queued-llm.repository.ts` (expose partial thinking)
  - Job status polling enhancement
  - Canvas animation system

- **Phase 3**:
  - SSE implementation in tRPC
  - Streaming token consumer
  - Unified display component

**Technical Details**:

```typescript
// Phase 1: Extend LLM types
interface LLMRequestParams {
  // ... existing fields
  reasoning?: boolean; // Request thinking tokens
}

interface LLMResponse {
  // ... existing fields
  reasoning?: string; // Thinking tokens
}

// Phase 2: Enhanced job status
interface JobStatus {
  // ... existing fields
  partialThinking?: string; // Progressive thinking tokens
}

// Phase 3: Streaming support
const streamingModels = ['gpt-4o-mini', 'claude-3-haiku'];
const queuedModels = ['deepseek/deepseek-r1-0528', 'o1-preview'];
```

**Pros**:
- ✅ Immediate value delivery
- ✅ Progressive enhancement
- ✅ Works with existing queue system
- ✅ Balanced complexity/benefit
- ✅ Each phase is shippable

**Cons**:
- ❌ Longer total timeline (5-7 days)
- ❌ Some temporary solutions
- ❌ Thinking tokens delayed for queued models

### Recommendation

**Recommended Approach: Solution 3 - Hybrid Progressive Enhancement**

**Rationale**:
1. **Immediate Value**: Phase 1 delivers visible UX improvements in 2 days
2. **Pragmatic**: Works within existing architecture constraints
3. **Risk Mitigation**: Each phase can be tested and validated independently
4. **User Feedback**: Can gather feedback after each phase
5. **Technical Debt**: Minimal - each phase builds toward final architecture
6. **Flexibility**: Can adjust approach based on learnings

**Implementation Priority**:
1. Start with Phase 1 immediately (UI + thinking capture)
2. Deploy and test with users
3. Implement Phase 2 for better queued model experience
4. Complete Phase 3 for optimal streaming experience

This approach balances immediate user value with long-term architectural goals while managing complexity and risk effectively.

## Architecture

*I am an AI assistant acting on behalf of @ulysse*

### Subsystem Changes Overview

Based on the recommended Solution 3 (Hybrid Progressive Enhancement), the following subsystems will be affected:

#### Modified Subsystems
1. **Chat Subsystem** (`/src/app/map/Chat/`)
2. **Agentic Domain** (`/src/lib/domains/agentic/`)
3. **Canvas Subsystem** (`/src/app/map/Canvas/`)
4. **tRPC Router** (`/src/server/api/routers/agentic/`)

#### New Subsystems
None - all changes occur within existing subsystem boundaries

### Phase 1: UI Polish + Thinking Token Capture

#### Chat Subsystem Changes

**Modified Components:**
- `Timeline/MessageActorRenderer.tsx` - Slack-style layout
- `Timeline/MarkdownRenderer.tsx` - Enhanced styling
- `Timeline/Widgets/AIResponseWidget/index.tsx` - Color transitions
- `ChatPanel.tsx` - Improved thinking indicator

**Interface Changes:**
- No changes to `interface.ts` - public API remains the same
- No new dependencies - uses existing Tailwind utilities

**New Internal Implementation:**
```typescript
// Using Tailwind classes for transitions and layout
// MessageActorRenderer.tsx
<div className="flex items-baseline gap-2"> {/* Slack-style inline layout */}
  <span className="font-medium text-sm">{actor}</span>
  <span className="text-xs text-gray-400">{timestamp}</span>
</div>

// AIResponseWidget transitions using Tailwind
<div className={cn(
  "transition-colors duration-300",
  status === 'thinking' && "bg-yellow-100 border-yellow-300",
  status === 'processing' && "bg-orange-100 border-orange-300", 
  status === 'complete' && "bg-green-100 border-green-300"
)}>
```

#### Agentic Domain Changes

**Modified Repository Layer:**
```typescript
// openrouter.repository.ts - Extended interface
interface LLMRequestParams {
  messages: Message[]
  model: string
  temperature?: number
  maxTokens?: number
  reasoning?: boolean  // NEW: Request thinking tokens
}

interface LLMResponse {
  id: string
  model: string
  content: string
  usage: TokenUsage
  reasoning?: string   // NEW: Thinking tokens
  provider?: string
}
```

**Interface Changes:**
- Updates to `interface.ts` to expose reasoning in public API
- No new external dependencies

### Phase 2: Polling-Based Thinking Display

#### Chat-Agentic Integration Changes

**Modified tRPC Router:**
```typescript
// agentic.ts - Enhanced job status
interface JobStatus {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: string
  partialThinking?: string  // NEW: Progressive thinking tokens
  thinkingProgress?: number // NEW: Percentage complete
}
```

#### Canvas Subsystem Changes

**EventBus Listener Implementation:**
```typescript
// Canvas subsystem listens for AI thinking events
// Canvas/hooks/useAIThinkingAnimation.ts
useEffect(() => {
  const handleThinkingEvent = (event: AIThinkingEvent) => {
    switch (event.type) {
      case 'ai.thinking.start':
        startScanningAnimation()
        break
      case 'ai.thinking.progress':
        updateScanningProgress(event.payload.progress)
        highlightTiles(event.payload.tilesBeingConsidered)
        break
      case 'ai.thinking.complete':
        stopScanningAnimation()
        break
    }
  }
  
  EventBus.subscribe('ai.thinking.*', handleThinkingEvent)
  return () => EventBus.unsubscribe('ai.thinking.*', handleThinkingEvent)
}, [])
```

**Interface Changes:**
- No changes to Canvas `interface.ts` - Canvas only listens
- No new dependencies - EventBus already available

#### Cross-Subsystem Communication via EventBus

**Chat Publishes Events:**
```typescript
// Chat/_hooks/useAIChat.ts
EventBus.publish({
  type: 'ai.thinking.start',
  payload: { requestId: id }
})

EventBus.publish({
  type: 'ai.thinking.progress', 
  payload: {
    requestId: id,
    progress: 0.5,
    partialThinking: "Analyzing the map structure...",
    tilesBeingConsidered: ['tile-1', 'tile-2'] // tile IDs
  }
})

EventBus.publish({
  type: 'ai.thinking.complete',
  payload: { requestId: id }
})
```

**EventBus Event Definitions:**
```typescript
// Shared event types (in a common location like lib/events/)
interface AIThinkingStartEvent {
  type: 'ai.thinking.start'
  payload: { requestId: string }
}

interface AIThinkingProgressEvent {
  type: 'ai.thinking.progress'
  payload: {
    requestId: string
    progress: number // 0-1
    partialThinking?: string
    tilesBeingConsidered?: string[] // tile IDs to highlight
  }
}

interface AIThinkingCompleteEvent {
  type: 'ai.thinking.complete'
  payload: { requestId: string }
}

type AIThinkingEvent = 
  | AIThinkingStartEvent 
  | AIThinkingProgressEvent 
  | AIThinkingCompleteEvent
```

**No Direct Dependencies:**
- Chat doesn't import from Canvas
- Canvas doesn't import from Chat
- Communication happens through EventBus only

### Phase 3: Direct Model Streaming

#### New Streaming Infrastructure

**Location:** Within tRPC router layer (not a new subsystem)

**Components:**
```typescript
// server/api/streaming/sse-handler.ts
class SSEHandler {
  constructor(response: Response)
  send(event: StreamEvent): void
  close(): void
}

// server/api/streaming/thinking-stream.ts
interface ThinkingStream {
  onToken(token: string): void
  onComplete(full: string): void
  onError(error: Error): void
}
```

#### Modified Interfaces

**Chat Subsystem:**
```typescript
// New hook for streaming consumption
_hooks/useStreamingResponse.ts
- Consumes SSE events
- Updates local state progressively
- Fallback to polling for queued models
```

**Agentic Domain:**
```typescript
// Enhanced repository interface
interface ILLMRepository {
  generateResponse(params: LLMRequestParams): Promise<LLMResponse>
  generateStream?(params: LLMRequestParams): AsyncIterable<StreamChunk>  // NEW
}
```

### Subsystem Boundary Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     Chat Subsystem                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Timeline   │  │   Widgets    │  │    Hooks     │  │
│  │ (UI Layout) │  │ (AI Widget)  │  │ (Publishes)  │  │
│  └─────────────┘  └──────────────┘  └───────┬──────┘  │
└─────────────────────────┬────────────────────┼──────────┘
                          │                     │
                          │ interface.ts        │ EventBus.publish()
                          │ (unchanged)         │ ai.thinking.*
                          │                     │
┌─────────────────────────┴─────────────────────┼──────────┐
│                    tRPC Router Layer          │          │
│  ┌────────────────────────────────────────────┼──────┐  │
│  │  Enhanced with SSE streaming (Phase 3)    │      │  │
│  │  Job status with partial thinking (Phase 2)│      │  │
│  └────────────────────────────────────────────┼──────┘  │
└─────────────────────────┬─────────────────────┼──────────┘
                          │                     │
┌─────────────────────────┴─────────────────────┼──────────┐
│                    Agentic Domain             │          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────┼──────┐  │
│  │ Repository  │  │   Service    │  │Infrastr│cture │  │
│  │ +reasoning  │  │  (unchanged) │  │(Inngest│)     │  │
│  └─────────────┘  └──────────────┘  └────────┼──────┘  │
└────────────────────────────────────────────────┼──────────┘
                                                 │
                                                 │ EventBus
                                                 │ (ai.thinking.*)
                                                 │
┌────────────────────────────────────────────────┼──────────┐
│                   Canvas Subsystem            │          │
│  ┌────────────────────────────────────────────▼──────┐  │
│  │  AI Scanning Animation (Listens to EventBus)     │  │
│  │  - Highlights tiles during thinking              │  │
│  │  - Shows progress visualization                  │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**EventBus Flow:**
1. Chat publishes `ai.thinking.*` events when AI processes
2. Canvas subscribes to these events (no direct dependency)
3. Canvas animates based on event payloads
4. Subsystems remain decoupled

### Key Architectural Decisions

1. **No New Subsystems**: All changes fit within existing boundaries
2. **Minimal Interface Changes**: Public APIs largely unchanged
3. **Progressive Enhancement**: Each phase is architecturally complete
4. **Backward Compatibility**: Existing functionality preserved
5. **Clear Boundaries**: Changes isolated to specific subsystems

### Mental Model

Think of this architecture as **three layers of enhancement**:

1. **Presentation Layer** (Chat UI): Visual improvements without changing data flow
2. **Data Layer** (Agentic Domain): Capture thinking tokens without changing service logic  
3. **Transport Layer** (tRPC/SSE): Add streaming without breaking existing polling

Each layer can be enhanced independently while maintaining clean interfaces between subsystems. The architecture preserves the hexagonal pattern in the Agentic domain and the event-driven pattern in the Chat subsystem.