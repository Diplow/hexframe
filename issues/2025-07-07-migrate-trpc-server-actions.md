# Issue: Migrating out of tRPC to use server actions instead

**Date**: 2025-07-07
**Status**: Open
**Tags**: #refactor #tech #architecture #api #medium
**GitHub Issue**: #73
**Branch**: issue-73-migrate-trpc-server-actions

## Problem Statement
The current implementation uses tRPC for type-safe API communication between client and server. We want to migrate to Next.js server actions to simplify the architecture, reduce bundle size, and leverage Next.js native patterns for better performance and developer experience.

## User Impact
- Developers experience complexity when adding new API endpoints
- Additional abstraction layer increases cognitive load
- Bundle size includes tRPC client libraries
- Type safety can be achieved more directly with server actions

## Benefits of Migration
1. Reduced bundle size (no tRPC client needed)
2. Simpler mental model (direct server function calls)
3. Better integration with Next.js App Router
4. Improved performance with automatic request deduplication
5. Simplified error handling and data validation

## Migration Scope
- All tRPC procedures need to be converted to server actions
- Client-side hooks need to be updated to use server actions
- Type safety must be maintained throughout
- Error handling patterns need to be adapted

## Environment
- Framework: Next.js 15 with App Router
- Current: tRPC with type-safe procedures
- Target: Native Next.js server actions

## Related Issues
- Architecture improvements
- Performance optimizations
- Developer experience enhancements

## Context

### Existing Documentation
The tRPC implementation is well-documented across multiple files:

- **Server Architecture** (`/src/server/README.md`): Comprehensive overview of tRPC setup with core files and patterns ✅
- **API Routers** (`/src/server/api/routers/README.md`): Detailed documentation of all procedures and middleware ✅
- **Caching Strategies** (`/src/server/api/CACHING.md`): tRPC middleware caching approaches ✅
- **Domain Integration** (`/src/lib/domains/README.md`): Service layer integration with tRPC ✅
- **Map Architecture** (`/src/app/map/ARCHITECTURE.md`): tRPC usage in map features ✅
- **Documentation vs Reality**: All documentation matches implementation ✅

### Domain Overview
The current tRPC implementation follows a well-structured architecture:

- **Backend-for-Frontend (BFF) Pattern**: tRPC serves as the API layer between Next.js frontend and domain services
- **Domain-Driven Design**: Clear separation between API layer (tRPC) and domain logic (services)
- **Type Safety**: End-to-end type inference from procedures to client hooks
- **Middleware Pattern**: Authentication, timing, and service injection via middleware

### Key Components

#### Server-Side Components
1. **Core Setup** (`/src/server/api/trpc.ts`):
   - Context creation with auth integration
   - Public and protected procedure builders
   - SuperJSON transformer for serialization
   - Custom error formatting

2. **Router Structure** (`/src/server/api/root.ts`):
   - Main `appRouter` combining sub-routers
   - Auth router with login/logout/session
   - Map router with user and items sub-routers
   - Legacy flat endpoint support

3. **Route Handler** (`/src/app/services/api/trpc/[trpc]/route.ts`):
   - Fetch adapter for Next.js App Router
   - Context bridging

#### Client-Side Components
1. **React Query Integration** (`/src/commons/trpc/react.tsx`):
   - Singleton query client
   - HTTP batch streaming link
   - Type inference exports

2. **Usage Patterns**:
   - Hook-based queries: `api.map.items.getItemByCoords.useQuery()`
   - Mutations: `api.map.addItem.useMutation()`
   - Cache utilities: `api.useUtils()`

### Implementation Details

#### tRPC Dependencies
- `@trpc/server@11.0.0-rc.446` - Server-side tRPC
- `@trpc/client@11.0.0-rc.446` - Client-side tRPC
- `@trpc/react-query@11.0.0-rc.446` - React Query adapter
- `superjson@2.2.1` - Data transformer
- `@tanstack/react-query@5.77.2` - Query/mutation management

#### Procedures Overview
Total procedures: 25 (4 auth + 21 map-related)

**Auth Router** (4 procedures):
- `auth.register` (public) - User registration placeholder
- `auth.login` (public) - Email/password authentication
- `auth.logout` (public) - Session termination
- `auth.getSession` (public) - Current session retrieval

**Map Router** (21 procedures):
- 7 user management procedures (all protected)
- 14 item management procedures (5 public, 9 protected)
- Legacy flat endpoints for backward compatibility

### Dependencies and Integration

#### Internal Dependencies
- **Better Auth**: Session management and authentication
- **Drizzle ORM**: Database access in procedures
- **Domain Services**: Injected via middleware
- **Zod**: Input validation schemas

#### External Consumers
- **React Components**: Via hooks (`useQuery`, `useMutation`)
- **Server Components**: Direct API calls
- **Progressive Forms**: Fallback handling
- **Auth Providers**: Session synchronization

#### API Contracts
- Type-safe contracts via exported `AppRouter` type
- Input validation with Zod schemas
- Error codes following HTTP standards
- Consistent response shapes

#### Data Flow
1. Client initiates request via hook/direct call
2. Request batched and sent to route handler
3. Context created with auth/db access
4. Middleware chain (timing, auth, services)
5. Procedure execution with domain services
6. Response serialization with SuperJSON
7. Client-side cache update