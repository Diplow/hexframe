# Agentic Router

## Why This Exists
This subsystem provides tRPC API endpoints for AI-powered chat interactions within Hexframe. It handles LLM generation requests, manages queued AI jobs, and bridges the frontend chat interface with the agentic domain services.

## Mental Model
The API gateway for all AI interactions, handling both synchronous and asynchronous LLM operations.

## Core Responsibility
This subsystem owns:
- tRPC endpoints for AI chat generation
- Job status polling for queued operations
- Rate limiting for AI requests
- Context preparation from cache state

This subsystem does NOT own:
- LLM provider logic (delegated to agentic domain)
- Authentication (delegated to tRPC middleware)
- Chat UI state (delegated to frontend)

## Public API
See `interface.ts` for the public API. Main capabilities:
- `agenticRouter` - tRPC router with AI endpoints

## Dependencies
See `dependencies.json` for allowed imports.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for structure details.