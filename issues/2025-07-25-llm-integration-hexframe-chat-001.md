# Issue: Integrate Real LLM into Hexframe Chat

**Date**: 2025-07-25
**Status**: Open
**Tags**: #feature #agentic #chat #architecture #high
**GitHub Issue**: #90
**Branch**: issue-001-llm-integration-hexframe-chat

## Problem Statement
I would like to plug a real LLM into the hexframe chat. For starter it would have the current center and the next 2 generations in its context and the current chat timeline. It would be capable to use a claude code instance (we would have to check if it is possible first). This is a big feature that involves creating a new domain "agentic".

## User Impact
- Users will be able to interact with a real LLM within Hexframe chat
- The LLM will have contextual awareness of the current tile hierarchy (center + 2 generations)
- Users can leverage AI capabilities directly within their hexagonal mapping workflows
- Enables integration with Claude Code for enhanced development capabilities

## Requirements
1. LLM Integration
   - Connect to a real LLM service (e.g., Claude API)
   - Provide tile context (current center + next 2 generations)
   - Include current chat timeline in context

2. Claude Code Integration
   - Investigate feasibility of Claude Code instance integration
   - Enable LLM to use Claude Code capabilities if possible

3. New Domain Structure
   - Create new "agentic" domain for AI-related functionality
   - Follow existing domain patterns and architecture

## Technical Considerations
- API integration with LLM service
- Context management and token optimization
- Real-time chat interface updates
- Security and API key management
- Rate limiting and cost considerations

## Related Issues
- None currently identified

## Context

*I am an AI assistant acting on behalf of @Diplow*

### Existing Documentation
Lists all relevant documentation found and verifies accuracy:

- **README Files**: 
  - `/src/lib/domains/README.md` - Domain-Driven Design principles and structure ✅
  - `/src/app/map/ARCHITECTURE.md` - Map application architecture with event-driven patterns ✅
  - `/src/app/map/Chat/ARCHITECTURE.md` - Chat component event-driven architecture ✅
  - `/src/app/map/Cache/ARCHITECTURE.md` - MapCache hierarchical loading and region-based caching ✅

- **Architecture Docs**: All documentation appears current and accurately reflects the implementation
- **Documentation vs Reality**: Architecture patterns match the code implementation ✅

### Domain Overview
High-level understanding of the domain/area affected by the issue:

The system follows Domain-Driven Design with isolated domains that communicate through the API layer. Key principles:
- **Domain Independence**: Domains cannot call each other directly
- **Event-Driven Architecture**: Components communicate through EventBus with notification events (past tense)
- **Hierarchical Tile System**: Hexagonal map with parent-child relationships
- **Chat as UI Layer**: Chat is a conversational interface that uses MapCache for operations

### Key Components

**Chat System** (`/src/app/map/Chat/`):
- `ChatPanel.tsx`: Main chat component with provider
- `ChatMessages.tsx`: Message rendering
- `types.ts`: ChatMessage and ChatWidget interfaces
- Event-driven state management with immutable event log
- Widget system for complex interactions (preview, login, creation, etc.)

**MapCache** (`/src/app/map/Cache/`):
- Central data management for all map operations
- Region-based caching with hierarchical loading
- Coordinates system: `coordId` format is `"{userId},{groupId}:{path}"`
- Selectors for accessing tile hierarchy and generations

**Event Bus** (`/src/app/map/Services/EventBus/`):
- Notification events (90%): Past-tense events about completed actions
- Request events (10%): UI coordination between Canvas and Chat
- All cross-component communication flows through EventBus

**Domain Structure** (`/src/lib/domains/`):
- Existing domains: `iam` (authentication) and `mapping` (tile operations)
- No "agentic" domain currently exists
- Domains follow strict layered architecture: entities → actions → services → repositories

### Implementation Details
Current code structure and patterns:

**Chat-MapCache Integration**:
- Chat uses MapCache for all mutations (create, update, delete tiles)
- Chat listens to EventBus for all map events
- No direct LLM integration currently exists

**Tile Context Management**:
- `selectRegionItems` selector in `/src/app/map/Cache/State/selectors.ts` can retrieve tiles by depth
- Supports getting center tile + N generations of descendants
- Coordinate system allows hierarchical traversal

**Current Chat Capabilities**:
- System and user messages
- Widget-based interactions
- Command processing (e.g., `/create`)
- Event-based state updates

**Missing for LLM Integration**:
- No API integration with LLM services
- No context serialization for LLM consumption
- No "agentic" domain for AI-related functionality
- No mechanism to provide tile hierarchy as LLM context

### Technical Decision: OpenRouter Integration

After investigating Claude Code SDK, we've decided to use **OpenRouter** for LLM integration because:
- Claude Code SDK requires Anthropic API key (tied to their pricing)
- OpenRouter provides access to free models for development
- Allows easy model selection and switching
- Unified API for multiple LLM providers (Claude, GPT, Llama, etc.)
- Better cost control and flexibility

### Dependencies and Integration

**Internal Dependencies**:
- Chat depends on MapCache for data operations
- Chat depends on EventBus for event notifications
- Both Chat and Canvas use MapCache independently

**External Consumers**:
- Chat is consumed by MapPageContent
- Events from Chat are consumed by any EventBus listeners

**API Contracts**:
- tRPC routers handle cross-domain orchestration
- No existing LLM-related API endpoints

**Database Schema**:
- Map items stored with hierarchical relationships
- No chat history persistence currently
- No LLM context storage

## Solution

*I am an AI assistant acting on behalf of @Diplow*

### Solution 1: Minimal Integration (Quick Start)

**Overview**: Direct OpenRouter integration in Chat component with minimal new infrastructure.

**Implementation Path**:
1. Add OpenRouter API client to Chat component
2. Create new "AI Assistant" widget type
3. Add LLM message handler in chat state
4. Context builder utility for tile hierarchy

**Components Affected**:
- `/src/app/map/Chat/types.ts` - Add AI widget type
- `/src/app/map/Chat/_state/ChatProvider.tsx` - Add LLM handler
- `/src/app/map/Chat/Widgets/AIAssistantWidget.tsx` - New widget
- `/src/app/map/Chat/_utils/context-builder.ts` - New utility

**Technical Details**:
```typescript
// New AI widget type
interface AIAssistantWidgetData {
  model: string;
  systemPrompt?: string;
  temperature?: number;
}

// Context builder
function buildLLMContext(state: CacheState, center: string) {
  const tiles = selectRegionItems({ state, centerCoordId: center, maxDepth: 2 });
  return formatTilesForLLM(tiles);
}
```

**Pros**:
- ✅ Quick implementation (2-3 days)
- ✅ Minimal changes to existing code
- ✅ Easy to test and iterate

**Cons**:
- ❌ Violates domain separation principles
- ❌ No backend persistence
- ❌ Limited extensibility
- ❌ API keys in frontend (security risk)

### Solution 2: Event-Driven Domain Integration (Architecturally Sound)

**Overview**: Full "agentic" domain implementation following DDD principles with event-driven integration.

**Implementation Path**:
1. Create new "agentic" domain structure
2. Implement OpenRouter repository
3. Create agentic service with context management
4. Add tRPC router for API orchestration
5. Integrate with Chat via EventBus

**New Domain Structure**:
```
/src/lib/domains/agentic/
├── README.md
├── _objects/
│   ├── conversation.ts      # Conversation entity
│   ├── llm-message.ts       # LLM message value object
│   └── context-snapshot.ts  # Tile context snapshot
├── _actions/
│   ├── generate-response.ts # LLM response generation
│   ├── manage-context.ts    # Context building/optimization
│   └── select-model.ts      # Model selection logic
├── _repositories/
│   └── llm.repository.ts    # LLM provider interface
├── services/
│   └── agentic.service.ts   # Main service facade
├── infrastructure/
│   └── openrouter/
│       └── client.ts        # OpenRouter implementation
└── types/
    ├── contracts.ts         # API contracts
    └── errors.ts            # Domain errors
```

**Components Affected**:
- New domain: `/src/lib/domains/agentic/`
- `/src/server/api/routers/agentic.ts` - New tRPC router
- `/src/app/map/Chat/_state/_events/event.types.ts` - New event types
- `/src/app/map/Chat/Widgets/AIAssistantWidget.tsx` - New widget

**Integration Flow**:
```typescript
// tRPC router orchestration
export const agenticRouter = createTRPCRouter({
  generateResponse: protectedProcedure
    .use(agenticServiceMiddleware)
    .use(mappingServiceMiddleware)
    .input(generateResponseSchema)
    .mutation(async ({ ctx, input }) => {
      // Get tile context from mapping service
      const context = await ctx.mappingService.getTileHierarchy(
        input.centerCoordId, 
        { maxDepth: 2 }
      );
      
      // Generate LLM response
      const response = await ctx.agenticService.generateResponse({
        messages: input.messages,
        tileContext: context,
        model: input.model
      });
      
      // Emit event for Chat
      ctx.eventBus.emit({
        type: 'agentic.response_generated',
        payload: { response }
      });
      
      return response;
    })
});
```

**Event Integration**:
```typescript
// New events
type AgenticEvents = 
  | { type: 'agentic.response_requested'; payload: { messages, model } }
  | { type: 'agentic.response_generated'; payload: { response } }
  | { type: 'agentic.context_updated'; payload: { tileContext } }
```

**Pros**:
- ✅ Follows established architecture patterns
- ✅ Backend API key management (secure)
- ✅ Extensible for future AI features
- ✅ Proper separation of concerns
- ✅ Testable at each layer

**Cons**:
- ❌ More complex implementation (1-2 weeks)
- ❌ Requires backend infrastructure
- ❌ More moving parts

### Solution 3: Progressive Enhancement (Recommended)

**Overview**: Phased approach starting with frontend prototype, then migrating to proper domain architecture.

**Phase 1 - Frontend Prototype (3 days)**:
- Implement basic AI widget in Chat
- Use environment variables for API keys
- Context builder using MapCache selectors
- Model selection dropdown

**Phase 2 - Backend Migration (1 week)**:
- Create agentic domain structure
- Move OpenRouter calls to backend
- Implement tRPC endpoints
- Add proper error handling

**Phase 3 - Advanced Features (1 week)**:
- Conversation persistence
- Token usage tracking
- Model-specific optimizations
- Streaming responses

**Implementation Strategy**:

**Phase 1 Components**:
```typescript
// Environment config
interface AgenticConfig {
  openRouterApiKey: string;
  defaultModel: string;
  maxTokens: number;
}

// AI Assistant Widget
export function AIAssistantWidget({ onSendMessage }: Props) {
  const { state } = useMapCache();
  const [model, setModel] = useState('openai/gpt-3.5-turbo');
  
  const handleGenerate = async (prompt: string) => {
    const context = buildTileContext(state);
    const response = await callOpenRouter({ prompt, context, model });
    onSendMessage(response);
  };
}
```

**Phase 2 Migration Path**:
1. Keep frontend UI unchanged
2. Replace direct API calls with tRPC mutations
3. Move context building to service layer
4. Add authentication checks

**Phase 3 Enhancements**:
- WebSocket for streaming
- Redis for conversation cache
- Prometheus metrics for usage

**Pros**:
- ✅ Quick initial value delivery
- ✅ Validates UX before heavy investment
- ✅ Smooth migration path
- ✅ Each phase is independently valuable
- ✅ Lower risk approach

**Cons**:
- ❌ Temporary technical debt in Phase 1
- ❌ Requires refactoring between phases
- ❌ Initial version has security limitations

### Tradeoff Analysis

| Aspect | Solution 1 | Solution 2 | Solution 3 |
|--------|------------|------------|------------|
| **Time to First Value** | 2-3 days | 1-2 weeks | 3 days |
| **Security** | Poor | Excellent | Moderate→Excellent |
| **Maintainability** | Poor | Excellent | Good→Excellent |
| **Extensibility** | Limited | High | Progressive |
| **Technical Debt** | High | Low | Temporary |
| **Risk** | Low | Medium | Low |

### Selected Approach: Solution 2 (Event-Driven Domain Integration)

**Decision Date**: 2025-07-25
**Decision Maker**: @Diplow

**Rationale for Selection**:
1. **Architectural Integrity**: Maintains consistency with existing DDD patterns
2. **Security First**: Backend API key management from the start
3. **Long-term Vision**: Sets foundation for future AI capabilities
4. **Clean Separation**: Proper domain boundaries prevent technical debt
5. **Testability**: Each layer can be tested independently

**Implementation Plan**:
1. Create agentic domain structure with entities, actions, and services
2. Implement OpenRouter repository following existing patterns
3. Build context management for tile hierarchy serialization
4. Create tRPC router with proper middleware chain
5. Integrate Chat component with new AI widget
6. Add comprehensive tests at each layer

**Success Criteria**:
- Agentic domain follows DDD principles
- OpenRouter integration with configurable models
- Tile context (center + 2 generations) properly serialized
- Chat interface seamlessly integrates LLM responses
- All layers have appropriate test coverage

**Next Steps**:
1. Create agentic domain skeleton
2. Implement OpenRouter client
3. Design context serialization format
4. Build tRPC endpoints
5. Create AI Assistant widget

## Architecture

*I am an AI assistant acting on behalf of @Diplow*

### Current State

**Existing Components**:
- **Chat System**: Event-driven UI layer with widget system for complex interactions
- **MapCache**: Central data orchestrator providing tile hierarchy through selectors
- **EventBus**: Cross-component communication channel for notifications and requests
- **Domain Layer**: Isolated domains (IAM, Mapping) with strict boundaries
- **tRPC Router**: API layer orchestrating cross-domain operations

**Key Patterns**:
- Domain-Driven Design with complete isolation
- Event-driven architecture with past-tense notifications
- Layered architecture: UI → API → Domain → Infrastructure
- No direct domain-to-domain communication

### New Components

**1. Agentic Domain** (`/src/lib/domains/agentic/`)
```
agentic/
├── _objects/
│   ├── conversation.ts         # Entity: Conversation with messages
│   ├── llm-message.ts          # Value Object: LLM message with metadata
│   ├── context-snapshot.ts     # Value Object: Serialized tile hierarchy
│   └── model-config.ts         # Value Object: Model configuration
├── _actions/
│   ├── generate-response.ts    # Generate LLM response with context
│   ├── build-context.ts        # Build tile hierarchy context
│   ├── select-model.ts         # Model selection logic
│   └── optimize-tokens.ts      # Token usage optimization
├── _repositories/
│   └── llm.repository.ts       # Abstract interface for LLM providers
├── services/
│   └── agentic.service.ts      # Public API for domain operations
├── infrastructure/
│   └── openrouter/
│       ├── client.ts           # OpenRouter API implementation
│       └── mapper.ts           # Map domain objects to API format
└── types/
    ├── contracts.ts            # DTOs for API communication
    ├── errors.ts               # Domain-specific errors
    └── constants.ts            # Model names, limits, etc.
```

**2. Agentic Router** (`/src/server/api/routers/agentic.ts`)
- tRPC router orchestrating agentic and mapping domains
- Middleware for authentication and rate limiting
- Event emission for Chat integration

**3. AI Assistant Widget** (`/src/app/map/Chat/Widgets/AIAssistantWidget.tsx`)
- Model selection dropdown
- Context preview display
- Response streaming UI
- Token usage indicator

### Modified Components

**1. Chat Event System**
- New event types in `/src/app/map/Chat/_state/_events/event.types.ts`:
  ```typescript
  | { type: 'llm_response_requested'; payload: LLMRequestPayload }
  | { type: 'llm_response_received'; payload: LLMResponsePayload }
  | { type: 'llm_stream_chunk'; payload: StreamChunkPayload }
  | { type: 'llm_error_occurred'; payload: LLMErrorPayload }
  ```

**2. Chat Types**
- New widget type in `/src/app/map/Chat/types.ts`:
  ```typescript
  interface ChatWidget {
    type: '...' | 'ai-assistant';
    data: unknown;
  }
  
  interface AIAssistantWidgetData {
    conversationId?: string;
    model: string;
    systemPrompt?: string;
    contextDepth: number;
    temperature: number;
  }
  ```

**3. Event Bus Integration**
- New event namespace `agentic.*` for LLM-related events
- Events flow from tRPC router to Chat via EventBus

### Data Flow

```
User Input in Chat
      ↓
AI Assistant Widget
      ↓
Chat dispatches llm_response_requested event
      ↓
tRPC mutation: agentic.generateResponse
      ↓
Agentic Service orchestrates:
├── Mapping Service: getTileHierarchy(center, depth=2)
├── Context Builder: serialize tiles to LLM format
└── OpenRouter Client: send request with context
      ↓
Response flows back through tRPC
      ↓
EventBus emits agentic.response_generated
      ↓
Chat receives event and updates UI
      ↓
AI response displayed to user
```

### Mental Model

**Think of the LLM integration as a "Smart Assistant" that:**
1. **Sees the Map**: Has awareness of the current tile hierarchy (center + 2 generations)
2. **Understands Context**: Receives structured tile data in a format optimized for LLMs
3. **Respects Boundaries**: Lives in its own domain, communicates via events
4. **Stays Secure**: API keys managed on backend, never exposed to frontend

**Key Concepts**:
- **Context Window**: The tile hierarchy snapshot sent to the LLM
- **Model Abstraction**: Repository pattern allows swapping LLM providers
- **Event Flow**: All LLM interactions are asynchronous and event-driven
- **Token Economy**: Context builder optimizes what tiles to include

### Key Patterns

**1. Repository Pattern for LLM Providers**
```typescript
interface LLMRepository {
  generateResponse(params: GenerateParams): Promise<LLMResponse>;
  streamResponse(params: GenerateParams): AsyncGenerator<StreamChunk>;
  getAvailableModels(): Promise<ModelInfo[]>;
}
```

**2. Context Serialization Strategy**
```typescript
interface TileContext {
  center: {
    id: string;
    name: string;
    content: string;
    metadata: Record<string, unknown>;
  };
  children: TileContext[];
  depth: number;
}
```

**3. Event-Driven Response Handling**
- Request initiated by user action
- Processing happens asynchronously
- Response delivered via event
- UI updates reactively

**4. Error Boundary Pattern**
- Domain errors (rate limit, token limit)
- Infrastructure errors (network, API)
- Graceful degradation in UI

### Security Considerations

**API Key Management**:
- Stored in environment variables on backend
- Never transmitted to frontend
- Accessed only by infrastructure layer

**Rate Limiting**:
- User-level quotas in tRPC middleware
- Model-specific limits enforced
- Graceful handling of rate limit errors

**Content Filtering**:
- Sanitize tile content before sending
- Validate LLM responses
- Prevent prompt injection via context

### Testing Strategy

**Unit Tests**:
- Domain objects and value objects
- Actions with mocked repositories
- Service layer with mocked dependencies

**Integration Tests**:
- tRPC router with real domain services
- Event flow from request to response
- Error scenarios and edge cases

**E2E Tests**:
- Complete flow from Chat UI to LLM response
- Model selection and context preview
- Error handling and recovery