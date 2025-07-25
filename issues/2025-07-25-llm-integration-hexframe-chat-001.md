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

### Recommended Approach: Solution 3 (Progressive Enhancement)

**Rationale**:
1. **Fast Validation**: Users can test LLM integration within days
2. **Risk Mitigation**: Each phase delivers value independently
3. **Learning Opportunity**: Phase 1 insights inform Phase 2 design
4. **Smooth Migration**: No breaking changes between phases
5. **Budget Friendly**: Can pause after any phase

**Success Criteria**:
- Phase 1: Working LLM chat with tile context
- Phase 2: Secure backend with proper architecture
- Phase 3: Production-ready with advanced features

**Next Steps**:
1. Implement Phase 1 prototype
2. Gather user feedback
3. Design Phase 2 based on learnings
4. Iterate and enhance