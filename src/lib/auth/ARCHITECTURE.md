# Auth Subsystem Architecture

## Purpose
Provides authentication services using Better Auth library.

## Structure
- `auth-client.ts` - Authentication client configuration and setup
- `interface.ts` - Public API exports

## Dependencies
- Better Auth library for authentication
- Next.js integration

## Interface
All external code must import through `interface.ts`:
```typescript
import { authClient } from '~/lib/auth/interface';
```