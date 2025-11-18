# Shared Libraries

Shared utilities, domain logic, and infrastructure code used across the application.

## Subsystems

- **domains/** - Domain-Driven Design bounded contexts (mapping, IAM, agentic)
- **utils/** - General-purpose utility functions
- **debug/** - Debugging and logging utilities
- **auth/** - Authentication helpers

## Purpose

This directory contains code that is:
- **Framework-agnostic** - Not tied to Next.js or React
- **Reusable** - Used by both frontend and backend
- **Domain-focused** - Organized by business capability

## Architecture

Each domain in `domains/` follows Clean Architecture with:
- Types and interfaces
- Services (business logic)
- Repositories (data access)
- Infrastructure (external integrations)
