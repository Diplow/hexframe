# Agentic Services

This subsystem contains the core business logic for AI-powered agentic functionality in Hexframe.

## Services

- **agentic.service.ts** - Main agentic service orchestrator
- **agentic.factory.ts** - Factory for creating agentic instances
- **context-composition.service.ts** - Composes context for AI interactions
- **chat-context-builder.service.ts** - Builds context for chat interactions
- **canvas-context-builder.service.ts** - Builds context for canvas interactions
- **prompt-template.service.ts** - Manages prompt templates
- **context-serializer.service.ts** - Serializes context data
- **tokenizer.service.ts** - Handles tokenization for AI models

## Architecture

Services in this subsystem follow domain-driven design principles and are exposed through the index.ts file for clean boundaries.