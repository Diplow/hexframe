# Inngest API Route

## Why This Exists
This subsystem provides the Next.js API route handler for Inngest queue management. It exposes endpoints for receiving events and executing background functions for async LLM operations.

## Mental Model
The webhook endpoint that connects Inngest cloud with our background job handlers.

## Core Responsibility
This subsystem owns:
- Inngest webhook endpoint configuration
- Function registration and execution
- Event handling for queued jobs

This subsystem does NOT own:
- Job logic (delegated to agentic domain functions)
- Queue configuration (delegated to agentic infrastructure)
- Job status persistence (delegated to database)

## Public API
This is an API route handler - no TypeScript interface needed.

## Dependencies
See `dependencies.json` for allowed imports.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for structure details.