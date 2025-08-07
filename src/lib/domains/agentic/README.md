# Agentic Domain

The agentic domain provides LLM integration capabilities for Hexframe, enabling AI-powered interactions with contextual awareness of the tile hierarchy.

## Overview

This domain handles:
- LLM API integration (OpenRouter)
- Context building from tile hierarchies and chat history
- Secure prompt management and response filtering
- Token optimization and model selection

## Architecture

### Domain Structure

```
agentic/
├── _objects/           # Domain entities and value objects
├── _actions/          # Business logic and use cases
├── _security/         # Security layer for prompt injection protection
├── _repositories/     # Abstract interfaces for external services
├── services/          # Public API and orchestration
├── infrastructure/    # Concrete implementations (OpenRouter)
└── types/            # Type definitions and contracts
```

### Key Components

1. **Context Building**: Composable strategies for building LLM context from tiles and chat
2. **LLM Integration**: Repository pattern for provider abstraction
3. **Security Layer**: Multi-layer defense against prompt injection
4. **Service Facade**: Clean public API for domain operations

## Integration Points

- **Mapping Domain**: Retrieves tile hierarchies for context
- **tRPC Router**: API layer for frontend communication
- **EventBus**: Emits LLM response events for Chat UI

## Security Considerations

The domain implements comprehensive security measures:
- Input sanitization for tile content
- System prompt hardening
- Output filtering for harmful responses
- Audit logging for all LLM interactions

See `_security/` directory for implementation details.

## Testing

Tests follow TDD principles with comprehensive coverage:
- Unit tests for context builders and strategies
- Integration tests for service orchestration
- Security tests for injection protection
- Performance tests for context optimization

## Configuration

The domain respects environment variables:
- `OPENROUTER_API_KEY`: Required for LLM API access
- `OPENROUTER_BASE_URL`: Optional API endpoint override

Default context strategies and token allocations are configured in `config/context.config.ts`.