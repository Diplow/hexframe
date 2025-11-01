# Agentic Types

## Mental Model
The types directory is like a "type library" or "contract catalog" - a centralized collection of TypeScript type definitions that establish the data contracts and interfaces used throughout the agentic domain.

## Responsibilities
- Define core LLM interaction types (messages, responses, parameters, errors)
- Specify SDK-specific types for Claude Agent SDK integration
- Establish context composition and serialization type contracts
- Define job queue and async processing type structures
- Export all domain types through a single index for easy consumption

## Non-Responsibilities
- Type implementations or runtime behavior → See parent `../` for services and repositories
- LLM provider logic → See `../repositories/README.md`
- Context building logic → See `../services/README.md`
- Prompt templates → See `../prompts/`

## Interface
**Exports**: See `index.ts` for the complete public API. Key type exports:
- `LLMMessage`, `LLMGenerationParams`, `LLMResponse`: Core LLM interaction types
- `SDKQueryOptions`, `SDKStreamEvent`, `SDKResult`: Claude Agent SDK types
- `ComposedContext`, `ContextStrategy`: Context composition types
- `StreamChunk`, `ModelInfo`, `LLMError`: Supporting types

**Dependencies**: This subsystem has minimal dependencies and primarily defines types.

**Note**: All agentic domain code should import types from `~/lib/domains/agentic/types` (via the parent's index.ts export). The `pnpm check:architecture` tool enforces proper import boundaries.
