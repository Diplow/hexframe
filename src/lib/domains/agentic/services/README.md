# Agentic Services

## Mental Model
Like a translation bureau that takes hexagonal map context and chat history, converts them into AI-friendly formats, and orchestrates conversations with language models.

## Responsibilities
- Orchestrate AI conversations by combining map context with chat history
- Build and compose context from canvas (hexagonal tiles) and chat messages
- Manage prompt templates and AI model interactions (both streaming and non-streaming)
- Support tool usage in AI conversations for extended functionality
- Create and manage subagents with specific configurations and capabilities
- Handle tokenization and optimize context size to fit model limits
- Serialize complex domain data into AI-readable formats
- Select and configure LLM repositories (OpenRouter or Claude Agent SDK)

## Non-Responsibilities
- Canvas strategy implementations → See `./canvas-strategies/`
- Chat strategy implementations → See `./chat-strategies/`
- Context serialization formats → See `./serializers/`
- Unit tests → See `./__tests__/`
- Direct AI model communication → See `~/lib/domains/agentic/repositories`
- Intent classification logic → See `~/lib/domains/agentic/intent-classification`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.