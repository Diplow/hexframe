# Agentic Domain

## Mental Model
Like an AI assistant that understands your hexagonal maps and provides intelligent, contextually-aware responses based on the spatial relationships and content hierarchy.

## Responsibilities
- LLM provider integration and abstraction for various AI models
- Context building from hexagonal map hierarchies and chat conversation history
- Prompt engineering, optimization, and security against prompt injection attacks
- Response generation with both streaming and batch processing capabilities
- Token management and cost optimization for efficient AI interactions

## Non-Responsibilities
- AI model infrastructure and queue processing → See `./infrastructure/README.md`
- Domain entity types and contracts → See `./types/`
- Static prompt templates → See `./prompts/`
- Concrete LLM provider implementations → See `./repositories/README.md`
- Context building strategies and orchestration → See `./services/README.md`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.