# Issue: Introduce backend IAM domain for better authentication architecture

**Date**: 2025-07-07
**Status**: Open
**Tags**: #enhancement #refactor #architecture #auth #api #medium
**GitHub Issue**: [pending]
**Branch**: issue-71-introduce-backend-iam-domain

## Problem Statement
The current authentication implementation around betterauth works fine but lacks a proper backend domain structure. While betterauth provides solid authentication functionality, the codebase would benefit from introducing a backend IAM (Identity and Access Management) domain to improve code organization and maintain consistency with the domain-driven design approach used elsewhere in the project.

## User Impact
- Developers face inconsistent architecture patterns between authentication and other domains
- Future authentication-related features are harder to implement without clear domain boundaries
- Maintenance and testing of authentication logic is more complex without proper domain isolation
- Code reusability is limited without a well-structured IAM domain service

## Steps to Reproduce
1. Examine the current authentication implementation using betterauth
2. Compare with other domain implementations (e.g., mapping domain)
3. Notice the lack of a dedicated IAM domain with its own service layer
4. Observe that authentication operations are not exposed via tRPC like other domains

## Environment
- Development environment
- Backend architecture
- Frequency: Ongoing architectural concern

## Related Issues
- Architecture and domain-driven design improvements
- API consistency across domains

## Context

*I am an AI assistant acting on behalf of @Diplow*

### Existing Documentation

**README Files and Architecture Docs**:
- **`/src/lib/domains/README.md`** ✅: Comprehensive domain-driven design documentation explaining the layered architecture pattern
- **`/src/server/README.md`** ✅: Server architecture documentation covering tRPC API, database layer, and authentication
- **`/src/app/map/ARCHITECTURE.md`** ✅: Frontend architecture for mapping features (not directly relevant to backend IAM)
- **Authentication documentation** 📝: No dedicated README for the current auth implementation in `/src/lib/auth/`

**Documentation vs Reality**:
- Domain structure documentation matches implementation ✅
- Server architecture accurately describes current patterns ✅
- Authentication lacks domain-level documentation 📝
- User operations scattered across multiple routers without clear organization 📝

### Domain Overview

The codebase follows Domain-Driven Design with clear architectural patterns:

**Domain Architecture**:
- **Hexagonal Architecture**: Domain layer isolated from infrastructure concerns
- **Repository Pattern**: Interfaces define data contracts, implementations handle persistence
- **Service Layer**: High-level orchestration of domain operations
- **Contract Pattern**: DTOs separate API contracts from domain objects

**Current Domains**:
1. **Mapping Domain** (`/src/lib/domains/mapping/`):
   - Fully implemented with entities, actions, repositories, services
   - Exposed via tRPC with middleware pattern
   - Comprehensive test coverage

2. **Authentication System** (not yet a domain):
   - Uses `better-auth` library for authentication
   - Lives in `/src/lib/auth/` and `/src/server/auth.ts`
   - Integrated with tRPC context but not as a service
   - No domain boundaries or service layer

### Key Components

**Current Authentication Components**:

1. **Better-Auth Configuration**:
   - `/src/server/auth.ts`: Server-side auth configuration with PostgreSQL adapter
   - `/src/lib/auth/auth-client.ts`: Client-side auth configuration
   - Email/password authentication with JWT sessions

2. **Database Schema**:
   - `users`, `accounts`, `sessions`, `verificationTokens` tables from better-auth
   - `userMapping` table: Bridges auth users (text IDs) to mapping users (integer IDs)

3. **tRPC Integration**:
   - Context enhancement in `/src/server/api/trpc.ts`
   - `protectedProcedure` middleware for auth checks
   - Auth router with login/logout/session operations

4. **User Operations** (scattered):
   - `/src/server/api/routers/auth.ts`: Basic auth operations
   - `/src/server/api/routers/map-user.ts`: User-specific map operations
   - `/src/server/api/services/user-mapping.service.ts`: ID conversion service

### Implementation Details

**File Organization**:
```
Current (fragmented):
/src/lib/auth/              # Better-auth client config
/src/server/auth.ts         # Better-auth server config
/src/server/api/routers/    # Auth and user operations
  ├── auth.ts               # Login/logout
  └── map-user.ts           # User map operations
/src/server/api/services/   # Standalone services
  └── user-mapping.service.ts

Should follow domain pattern:
/src/lib/domains/iam/       # Proposed IAM domain
  ├── _objects/             # User, Role, Permission entities
  ├── _actions/             # User management, auth operations
  ├── _repositories/        # User, Role repositories
  ├── services/             # IAMService orchestration
  ├── infrastructure/       # DB implementations
  └── types/                # Contracts, errors, constants
```

**Naming Conventions**:
- Auth uses "user" for authenticated entities
- Mapping uses "userId" (integer) vs auth "id" (text)
- No consistent IAM terminology (roles, permissions not implemented)

**Design Patterns**:
- Service middleware pattern for domain injection
- Contract adapters for API responses
- Repository interfaces with DB implementations
- Transaction support for complex operations

**Data Flow**:
1. Authentication: Client → Better-auth → Session cookie
2. Authorization: tRPC context → protectedProcedure → User in context
3. User operations: Auth user ID → UserMappingService → Mapping user ID → Domain operations

### Dependencies and Integration

**Internal Dependencies**:
- Better-auth handles authentication
- tRPC procedures depend on auth context
- Mapping domain depends on user IDs from auth
- UserMappingService bridges the two ID systems

**External Consumers**:
- Frontend AuthContext uses auth client
- All protected routes require authenticated users
- Map operations require user ownership checks

**API Contracts**:
- Auth operations exposed via `/api/auth/*` (better-auth)
- User operations exposed via tRPC `auth.*` and `map.*` routers
- No unified IAM API surface

**Database Schema**:
- Auth tables managed by better-auth
- `userMapping` table connects auth to domain users
- No role/permission tables exist yet

### Current Gaps

1. **No IAM Domain Structure**: Authentication logic not organized as a domain
2. **Scattered User Operations**: User-related logic spread across multiple routers
3. **Missing Authorization**: No roles, permissions, or access control beyond ownership
4. **Inconsistent Service Pattern**: Auth not exposed as a service like mapping domain
5. **Limited Extensibility**: Hard to add IAM features without clear domain boundaries