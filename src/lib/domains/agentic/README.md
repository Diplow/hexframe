# Agentic Domain

## Why This Exists
The Agentic domain enables AI-powered interactions within Hexframe, making systems truly alive by providing intelligent assistance, content generation, and contextual understanding of hexagonal maps.

## Mental Model
An AI assistant that understands the spatial and hierarchical context of your hexagonal maps, providing intelligent responses based on the surrounding content.

## Core Responsibility
This domain owns:
- LLM provider integration and abstraction
- Context building from map hierarchies and chat history
- Prompt engineering and optimization
- Response generation and streaming
- Security against prompt injection
- Token management and cost optimization

This domain does NOT own:
- Map data storage (delegated to Mapping domain)
- User authentication (delegated to IAM domain)
- UI chat components (delegated to app layer)
- Real-time event distribution (delegated to EventBus)

## Public API
See `interface.ts` for the public API. Main capabilities:
- `AgenticService` - Main service for AI operations
- Context building strategies for different use cases
- LLM repository implementations
- Security filters and validators

## Dependencies
See `dependencies.json` for allowed imports.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for structure details.