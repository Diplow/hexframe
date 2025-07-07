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

## Solution

### Solution Overview

Three distinct approaches for migrating from tRPC to server actions, each with different tradeoffs:

1. **Incremental Adapter Pattern** - Build compatibility layer for gradual migration
2. **Domain-by-Domain Migration** - Replace entire domains (auth, then map) sequentially
3. **Parallel Implementation with Feature Flags** - Build server actions alongside tRPC

### Approach 1: Incremental Adapter Pattern

#### Implementation Path
1. Create server action wrapper that mimics tRPC API structure
2. Build generic adapter for converting tRPC procedures to server actions
3. Migrate procedures one-by-one behind the adapter
4. Update client hooks to use server actions transparently
5. Remove tRPC dependencies once all procedures migrated

#### Components Affected
- Create: `/src/server/actions/adapter.ts` - tRPC-to-server-action adapter
- Create: `/src/server/actions/[domain]/[action].ts` - Server action files
- Modify: `/src/commons/trpc/react.tsx` - Add server action support
- Create: `/src/hooks/useServerAction.ts` - Custom hook for server actions

#### Technical Details
```typescript
// Example adapter pattern
export function createServerActionFromProcedure<TInput, TOutput>(
  procedure: TRPCProcedure,
  validator: ZodSchema<TInput>
): ServerAction<TInput, TOutput> {
  return async function(input: TInput) {
    "use server";
    
    // Validation
    const parsed = validator.parse(input);
    
    // Auth check
    const session = await auth();
    if (procedure.requiresAuth && !session) {
      throw new Error("Unauthorized");
    }
    
    // Execute with context
    return procedure.handler({ input: parsed, ctx: { session } });
  };
}
```

### Approach 2: Domain-by-Domain Migration

#### Implementation Path
1. Start with auth domain (4 procedures)
2. Create `/src/server/actions/auth.ts` with all auth server actions
3. Update auth components to use server actions directly
4. Test auth flow end-to-end
5. Repeat for map domain (21 procedures)
6. Remove tRPC infrastructure after both domains migrated

#### Components Affected
- Create: `/src/server/actions/auth.ts` - Auth server actions
- Create: `/src/server/actions/map/user.ts` - Map user actions
- Create: `/src/server/actions/map/items.ts` - Map items actions
- Modify: All components using `api.auth.*` and `api.map.*`
- Create: `/src/lib/server-actions/types.ts` - Shared types

#### Technical Details
```typescript
// Auth server actions
export async function login(input: LoginInput) {
  "use server";
  
  const { email, password } = loginSchema.parse(input);
  
  // Use existing auth service
  const result = await authService.login({ email, password });
  
  if (!result.success) {
    throw new Error(result.error);
  }
  
  // Set cookies, return user
  return result.user;
}

// Client usage
import { login } from "~/server/actions/auth";

function LoginForm() {
  const handleSubmit = async (data) => {
    try {
      const user = await login(data);
      // Handle success
    } catch (error) {
      // Handle error
    }
  };
}
```

### Approach 3: Parallel Implementation with Feature Flags

#### Implementation Path
1. Implement all server actions in parallel with tRPC
2. Use feature flags to control which system is active
3. Build abstraction layer that routes to either system
4. Test both systems in production
5. Gradually shift traffic to server actions
6. Remove tRPC when confidence is high

#### Components Affected
- Create: `/src/server/actions/*` - All server actions
- Create: `/src/lib/feature-flags.ts` - Feature flag system
- Create: `/src/lib/api-router.ts` - Routes between tRPC/actions
- Modify: All API consuming components

#### Technical Details
```typescript
// API router abstraction
export function useApiQuery(endpoint: string, input: any) {
  const flag = useFeatureFlag("use-server-actions");
  
  if (flag) {
    return useServerAction(endpoint, input);
  } else {
    return useTRPCQuery(endpoint, input);
  }
}
```

### Tradeoff Analysis

#### Approach 1: Incremental Adapter Pattern
**Pros:**
- Minimal disruption to existing code
- Can migrate gradually, one procedure at a time
- Type safety maintained throughout
- Easy rollback per procedure

**Cons:**
- Additional abstraction layer complexity
- Longer total migration time
- Adapter code becomes technical debt
- May not realize full bundle size benefits until complete

#### Approach 2: Domain-by-Domain Migration
**Pros:**
- Clear migration boundaries
- Faster to see benefits (auth domain first)
- Simpler than adapter pattern
- Forces comprehensive testing per domain

**Cons:**
- Requires updating many components at once
- Higher risk during domain switchover
- No gradual rollback option per domain
- Auth domain migration blocks map domain work

#### Approach 3: Parallel Implementation
**Pros:**
- Zero downtime migration
- A/B testing capability
- Full rollback capability
- Can validate performance improvements

**Cons:**
- Duplicate implementation effort
- Maintains two systems temporarily
- Complex routing logic
- Delayed bundle size benefits

### Recommended Approach

**Recommendation: Approach 2 - Domain-by-Domain Migration**

#### Rationale
1. **Clear boundaries**: Auth (4 procedures) and Map (21 procedures) are well-separated domains
2. **Quick wins**: Auth domain can be migrated quickly, providing immediate validation
3. **Simplicity**: No complex adapters or dual systems to maintain
4. **Type safety**: Direct server action implementation maintains type safety
5. **Bundle size**: Immediate reduction after auth migration

#### Implementation Strategy
1. **Phase 1: Auth Domain** (1 week)
   - Implement 4 auth server actions
   - Update auth components
   - Test authentication flows
   - Deploy and monitor

2. **Phase 2: Map Domain** (2-3 weeks)
   - Implement map user actions (7 procedures)
   - Implement map items actions (14 procedures)
   - Update map components progressively
   - Maintain backward compatibility during migration

3. **Phase 3: Cleanup** (3 days)
   - Remove tRPC dependencies
   - Update documentation
   - Clean up unused code
   - Performance validation

#### Key Considerations
- Use existing Zod schemas for validation
- Maintain current error handling patterns
- Preserve React Query for client-side caching
- Create server action utilities for common patterns (auth checks, error handling)
- Implement comprehensive tests for each server action