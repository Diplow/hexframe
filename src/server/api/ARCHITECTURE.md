# Server API Architecture

## Overview

The server API follows a layered architecture with clear separation of concerns:

```
Client Request
    ↓
tRPC Router (type-safe endpoints)
    ↓
Middleware (auth, validation, logging)
    ↓
Service Layer (business logic)
    ↓
Domain Layer (core business rules)
    ↓
Repository/DB Layer (data persistence)
```

## Principles

### Type Safety
- All endpoints are fully type-safe through tRPC
- Zod schemas validate input/output at runtime
- TypeScript ensures compile-time safety

### Domain Boundaries
- Each domain has its own router in `routers/`
- Services coordinate between domains when needed
- Domain-specific logic stays within domain boundaries

### Caching Strategy
- Response caching at multiple levels (see `CACHING.md`)
- Optimistic updates on client side
- Cache invalidation through tRPC utilities

## Folder Structure

### `routers/`
Domain-specific API endpoints:
- `mapping.ts` - Map and tile operations
- `auth.ts` - Authentication endpoints
- `user.ts` - User management

### `middleware/`
Cross-cutting concerns:
- Authentication verification
- Request logging
- Error handling
- Rate limiting

### `services/`
Business logic coordination:
- Service classes that orchestrate domain operations
- Cross-domain business rules
- External service integrations

### `types/`
Shared API contracts:
- Request/response schemas
- Common types used across routers
- API-specific interfaces

## Guidelines

1. **Keep routers thin** - Move business logic to services
2. **Validate at boundaries** - Use Zod schemas for all inputs
3. **Handle errors gracefully** - Provide meaningful error messages
4. **Follow tRPC conventions** - Use appropriate procedures (query/mutation)
5. **Maintain type safety** - Never use `any` types