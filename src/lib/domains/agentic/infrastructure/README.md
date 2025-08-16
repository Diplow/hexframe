# Agentic Infrastructure

## Why This Exists
This subsystem provides infrastructure components for the agentic domain, including queue management for asynchronous LLM operations and integration with external services.

## Mental Model
Background job processors and external service integrations that support scalable AI operations.

## Core Responsibility
This subsystem owns:
- Queue client setup (Inngest)
- Background job definitions and handlers
- External service configurations
- Async processing infrastructure

This subsystem does NOT own:
- LLM provider implementations (delegated to repositories)
- Business logic (delegated to services)
- Context building (delegated to services)

## Public API
See `interface.ts` for the public API. Main capabilities:
- `inngest` - Inngest client for queue operations
- Background job functions for async LLM processing

## Dependencies
See `dependencies.json` for allowed imports.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for structure details.