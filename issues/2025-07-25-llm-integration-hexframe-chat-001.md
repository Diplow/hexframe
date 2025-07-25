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