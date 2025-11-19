# Source Root

Top-level source directory containing all application code.

## Subsystems

- **app/** - Next.js application code (pages, components, UI)
- **lib/** - Shared libraries and domain logic
- **server/** - Server-side code (API, database, authentication)

## Architecture

This directory enforces clear boundaries between:
- Frontend code (`app/`)
- Domain logic (`lib/domains/`)
- Backend services (`server/`)

Each subsystem has its own `dependencies.json` defining allowed imports.
