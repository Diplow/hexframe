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

## Solution

*I am an AI assistant acting on behalf of @Diplow*

### Solution 1: Minimal IAM Domain Wrapper

Create a lightweight IAM domain that wraps existing better-auth functionality while consolidating user operations.

**Implementation Path**:
1. Create `/src/lib/domains/iam/` structure with minimal entities
2. Build IAMService that wraps better-auth and UserMappingService
3. Consolidate user operations from scattered routers into IAM domain
4. Create IAM tRPC router following existing patterns
5. Migrate existing routers to use IAMService

**Components Affected**:
- `/src/server/api/routers/auth.ts` - Migrate to use IAMService
- `/src/server/api/routers/map-user.ts` - Extract user operations to IAM
- `/src/server/api/services/user-mapping.service.ts` - Move into IAM domain
- `/src/server/api/trpc.ts` - Add IAM service middleware

**New Components**:
```
/src/lib/domains/iam/
├── _objects/
│   └── user.ts              # User entity wrapping better-auth user
├── _actions/
│   └── user.actions.ts      # User operations (get, update profile)
├── _repositories/
│   └── user.repository.ts   # Interface for user data access
├── services/
│   └── iam.service.ts       # Orchestrates auth + user operations
├── infrastructure/
│   └── user/
│       └── better-auth-adapter.ts  # Adapts better-auth to repository
└── types/
    ├── contracts.ts         # API contracts for users
    └── errors.ts            # IAM-specific errors
```

**Pros**:
- Minimal disruption to existing code
- Quick to implement (1-2 days)
- Maintains better-auth as-is
- Easy rollback if issues

**Cons**:
- Limited domain modeling
- No authorization features
- Still dependent on better-auth structure
- Wrapper pattern may feel redundant

### Solution 2: Full IAM Domain with Progressive Migration

Build a complete IAM domain following DDD patterns, with phased migration from current implementation.

**Implementation Path**:
1. **Phase 1**: Create full domain structure with User aggregate
2. **Phase 2**: Build authorization entities (Role, Permission)
3. **Phase 3**: Implement IAMService with authentication + authorization
4. **Phase 4**: Create migration adapters for smooth transition
5. **Phase 5**: Gradually migrate features behind feature flags

**Components Affected**:
- All current auth-related files (gradual migration)
- Database schema additions for roles/permissions
- tRPC context enhancement for authorization

**New Components**:
```
/src/lib/domains/iam/
├── _objects/
│   ├── user.ts              # User aggregate with auth info
│   ├── role.ts              # Role entity
│   ├── permission.ts        # Permission value object
│   └── access-control.ts    # Access control policies
├── _actions/
│   ├── authentication.actions.ts  # Login, logout, register
│   ├── user.actions.ts           # User management
│   ├── role.actions.ts           # Role assignment
│   └── authorization.actions.ts   # Permission checks
├── _repositories/
│   ├── user.repository.ts
│   ├── role.repository.ts
│   └── permission.repository.ts
├── services/
│   ├── iam.service.ts            # Main service
│   ├── authentication.service.ts # Auth sub-service
│   └── authorization.service.ts  # Authz sub-service
├── infrastructure/
│   ├── user/
│   │   ├── db.ts                # Drizzle implementation
│   │   └── better-auth-bridge.ts # Bridge to better-auth
│   ├── role/
│   │   └── db.ts
│   └── transaction-manager.ts
└── types/
    ├── constants.ts         # Permissions, default roles
    ├── contracts.ts         # API contracts
    └── errors.ts            # Domain errors
```

**Database Changes**:
```sql
-- New tables
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  permissions JSONB NOT NULL
);

CREATE TABLE user_roles (
  user_id TEXT REFERENCES users(id),
  role_id INTEGER REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);
```

**Pros**:
- Complete domain modeling
- Future-proof with authorization
- Follows all DDD patterns
- Enables complex IAM features
- Testable and maintainable

**Cons**:
- Significant effort (1-2 weeks)
- Complex migration strategy needed
- Risk of breaking changes
- May be overengineered for current needs

### Solution 3: Hybrid Approach with Extensible Foundation

Create a well-structured IAM domain that starts simple but is designed for extension.

**Implementation Path**:
1. Build core IAM domain structure following DDD
2. Create User entity that wraps better-auth data
3. Implement IAMService with current features + extension points
4. Add repository pattern with better-auth adapter
5. Prepare infrastructure for future authorization

**Components Affected**:
- Consolidate all user operations into IAM domain
- Enhance tRPC with IAM service middleware
- Refactor auth routers to use IAM service

**New Components**:
```
/src/lib/domains/iam/
├── README.md                # Domain documentation
├── _objects/
│   ├── user.ts             # User entity with extension points
│   └── user-profile.ts     # Value object for profile data
├── _actions/
│   ├── authentication.actions.ts  # Current auth operations
│   └── user.actions.ts           # User management
├── _repositories/
│   └── user.repository.ts  # Extensible repository interface
├── services/
│   ├── iam.service.ts      # Main service with plugin architecture
│   └── __tests__/          # Comprehensive tests
├── infrastructure/
│   ├── user/
│   │   ├── better-auth-repository.ts  # Current implementation
│   │   └── db-repository.ts          # Future direct DB access
│   └── transaction-manager.ts
├── types/
│   ├── contracts.ts        # User contracts
│   ├── errors.ts           # IAM errors
│   └── plugins.ts          # Extension interfaces
└── utils/
    └── user-id-converter.ts # Handle dual ID system
```

**Key Design Decisions**:
- Repository interface supports future authorization queries
- Service designed with plugin/extension points
- User entity can be extended with roles/permissions
- Infrastructure ready for additional repositories

**Integration Approach**:
```typescript
// IAM Service Middleware
export const iamServiceMiddleware = t.middleware(async ({ ctx, next }) => {
  const repositories = {
    user: new BetterAuthUserRepository(auth, db),
  };
  const iamService = new IAMService(repositories);
  
  return next({
    ctx: {
      ...ctx,
      iamService,
      // Keep mappingService for compatibility
    },
  });
});

// Enhanced protected procedure
export const iamProtectedProcedure = publicProcedure
  .use(iamServiceMiddleware)
  .use(async ({ ctx, next }) => {
    const user = await ctx.iamService.getCurrentUser();
    if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
    
    return next({
      ctx: {
        ...ctx,
        user, // Domain user entity
      },
    });
  });
```

**Pros**:
- Balanced complexity (3-4 days)
- Follows domain patterns
- Easy to extend later
- Maintains compatibility
- Clear migration path

**Cons**:
- Some upfront design work
- Not all features immediately available
- Still requires careful migration

### Recommended Approach: Solution 3 (Hybrid)

**Rationale**:
1. **Pragmatic**: Balances immediate needs with future extensibility
2. **Low Risk**: Can be implemented without breaking existing code
3. **Follows Patterns**: Maintains consistency with mapping domain
4. **Extensible**: Foundation ready for roles/permissions when needed
5. **Testable**: Clear boundaries enable comprehensive testing

**Implementation Phases**:

**Phase 1 - Foundation (2 days)**:
- Create domain structure
- Build User entity and repository interface
- Implement BetterAuthUserRepository adapter
- Create basic IAMService

**Phase 2 - Migration (1 day)**:
- Add IAM service middleware
- Migrate auth router to use IAMService
- Consolidate user operations from map-user router
- Update tests

**Phase 3 - Enhancement (1 day)**:
- Add comprehensive error handling
- Implement user profile management
- Create domain events for extensibility
- Document the new domain

**Success Metrics**:
- All auth operations go through IAM domain
- Consistent API surface via tRPC
- No breaking changes to existing code
- Foundation ready for authorization features
- Improved testability and maintainability

### Deep Dive: Registration Flow Comparison

To illustrate the hybrid approach, here's how the user registration flow would change:

#### Current Registration Flow

```typescript
// 1. Frontend submits to better-auth directly
await authClient.signUp.email({ email, password, name })

// 2. Better-auth creates user
// - Creates entry in 'users' table
// - Creates account entry with hashed password
// - Generates session

// 3. Post-registration in tRPC
await trpc.map.createDefaultMapForCurrentUser.mutate()
// - Calls UserMappingService.getOrCreateMappingUserId()
// - Creates mapping: auth.id (string) → mapping.userId (integer)
// - Creates default map

// 4. Redirect to map
router.push(`/map?center=${mapId}`)
```

**Issues**:
- Registration split between auth client and tRPC
- User creation and mapping ID creation are separate operations
- No transaction boundary between user and map creation
- Mapping user creation happens lazily on first map operation

#### New Registration Flow with IAM Domain

```typescript
// 1. Frontend calls a tRPC procedure that orchestrates domains
const result = await trpc.user.register.mutate({
  email,
  password,
  name,
  createDefaultMap: true
})

// 2. tRPC Router orchestrates across domains
// In /src/server/api/routers/user.ts
export const userRouter = createTRPCRouter({
  register: publicProcedure
    .use(iamServiceMiddleware)
    .use(mappingServiceMiddleware)
    .input(registerSchema)
    .mutation(async ({ ctx, input }) => {
      // Step 1: IAM domain handles user creation
      const user = await ctx.iamService.register({
        email: input.email,
        password: input.password,
        name: input.name
      });
      
      // Step 2: Create default map if requested (orchestration)
      let defaultMapId: string | undefined;
      if (input.createDefaultMap) {
        const map = await ctx.mappingService.maps.createMap({
          userId: user.mappingId,
          title: `${user.name || user.email}'s Space`,
          descr: "Your personal hexframe workspace"
        });
        defaultMapId = map.id;
      }
      
      // Step 3: Return combined result
      return {
        user: user.toContract(),
        defaultMapId
      };
    })
});

// 3. IAM Service stays focused on its domain
class IAMService {
  async register(input: RegisterInput): Promise<User> {
    // Uses better-auth under the hood
    const authResult = await this.repositories.user.create({
      email: input.email,
      password: input.password,
      name: input.name
    });
    
    // Domain User entity with mapping ID
    const user = User.create({
      id: authResult.id,
      email: authResult.email,
      name: authResult.name,
      mappingId: authResult.mappingId,
      createdAt: new Date()
    });
    
    return user;
  }
  
  // No knowledge of maps or other domains!
}

// 4. Clean separation of concerns
router.push(`/map?center=${result.defaultMapId}`)
```

#### Key Differences

**1. API Surface**:
- **Current**: Mixed between better-auth client API and tRPC
- **New**: Unified through tRPC `iam.*` namespace

**2. User Creation**:
- **Current**: Auth user and mapping user created separately
- **New**: Domain User entity includes both IDs from creation

**3. Transaction Boundaries**:
- **Current**: No transaction between user and map creation
- **New**: Can wrap entire flow in transaction if needed

**4. Error Handling**:
- **Current**: Partial state possible (user without mapping ID)
- **New**: Atomic operation - either all succeeds or all fails

**5. Testing**:
- **Current**: Hard to test - requires mocking better-auth client
- **New**: Easy to test with repository mocks

#### Implementation Details

**User Entity** (`/src/lib/domains/iam/_objects/user.ts`):
```typescript
export class User {
  private constructor(
    private readonly props: {
      id: string;        // Better-auth ID
      email: string;
      name?: string;
      mappingId: number; // Created immediately, not lazily
      createdAt: Date;
      updatedAt: Date;
    }
  ) {}
  
  static create(props: CreateUserProps): User {
    // Domain validation
    if (!isValidEmail(props.email)) {
      throw new InvalidEmailError(props.email);
    }
    return new User(props);
  }
  
  // Convert to API contract
  toContract(): UserContract {
    return {
      id: this.props.id,
      email: this.props.email,
      name: this.props.name,
      mappingId: this.props.mappingId,
    };
  }
}
```

**Repository Adapter** (`/src/lib/domains/iam/infrastructure/user/better-auth-repository.ts`):
```typescript
export class BetterAuthUserRepository implements UserRepository {
  constructor(
    private auth: BetterAuth,
    private db: Database,
    private userMappingService: UserMappingService
  ) {}
  
  async create(input: CreateUserInput): Promise<User> {
    // 1. Create auth user via better-auth
    const authUser = await this.auth.api.signUpEmail({
      body: {
        email: input.email,
        password: input.password,
        name: input.name,
      }
    });
    
    // 2. Create mapping ID in same operation
    const mappingId = await this.userMappingService
      .getOrCreateMappingUserId(authUser.user.id);
    
    // 3. Return domain User with both IDs
    return User.create({
      id: authUser.user.id,
      email: authUser.user.email,
      name: authUser.user.name,
      mappingId,
      createdAt: new Date(),
    });
  }
}
```

**Migration Strategy**:
1. **Phase 1**: Keep existing registration working
2. **Phase 2**: Add new IAM registration endpoint
3. **Phase 3**: Update frontend to use new endpoint
4. **Phase 4**: Deprecate direct better-auth usage

**Benefits of New Approach**:
- Single source of truth for user operations
- Consistent error handling and validation
- Atomic user creation with all required data
- Easier to add features (e.g., welcome email, default settings)
- Better testability with clear boundaries
- Ready for future enhancements (roles on registration, org invites)

#### Domain Independence Benefits

By keeping domains independent and handling orchestration at the tRPC layer:

**1. True Domain Isolation**:
- IAM domain knows nothing about maps
- Mapping domain knows nothing about authentication internals
- Each domain can evolve independently

**2. Flexible Orchestration**:
```typescript
// Different registration flows become trivial
export const userRouter = createTRPCRouter({
  // Basic registration
  register: // ... as shown above
  
  // Organization invite flow
  registerWithInvite: publicProcedure
    .use(iamServiceMiddleware)
    .use(mappingServiceMiddleware)
    .use(orgServiceMiddleware) // Future domain
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.iamService.register(input);
      await ctx.orgService.acceptInvite(user.id, input.inviteToken);
      const map = await ctx.mappingService.maps.getOrgDefaultMap(orgId);
      return { user, mapId: map.id };
    }),
    
  // Admin creating user
  adminCreateUser: protectedProcedure
    .use(iamServiceMiddleware)
    .mutation(async ({ ctx, input }) => {
      await ctx.iamService.checkPermission(ctx.user, 'users:create');
      const newUser = await ctx.iamService.createUser(input);
      // No map creation - admin flow doesn't need it
      return { user: newUser };
    })
});
```

**3. Testing Advantages**:
```typescript
// Test IAM domain in complete isolation
describe('IAMService', () => {
  it('registers user', async () => {
    const service = new IAMService({ user: mockUserRepo });
    const user = await service.register({ email, password });
    expect(user.email).toBe(email);
    // No need to mock mapping service!
  });
});

// Test orchestration separately
describe('User Registration Flow', () => {
  it('creates user and map', async () => {
    const { trpc } = createTestContext({
      iamService: mockIAMService,
      mappingService: mockMappingService
    });
    
    const result = await trpc.user.register.mutate(input);
    expect(mockIAMService.register).toHaveBeenCalled();
    expect(mockMappingService.maps.createMap).toHaveBeenCalled();
  });
});
```

**4. Clear Architectural Boundaries**:
- **Domains**: Pure business logic, no cross-domain dependencies
- **tRPC Routers**: Application workflows and orchestration
- **Services**: Domain operations exposed to routers
- **Infrastructure**: Technical implementations

This approach gives you maximum flexibility while maintaining clean architecture!