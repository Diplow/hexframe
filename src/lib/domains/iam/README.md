# IAM Domain

The Identity and Access Management (IAM) domain handles user authentication, identity management, and (future) authorization within the Hexframe application.

## Overview

The IAM domain provides a clean domain-driven interface to authentication operations while maintaining compatibility with the existing better-auth implementation and the legacy mapping system. It serves as the single source of truth for user identity across the application.

## Key Concepts

### User Entity

The core entity representing a user in the system:
- **Dual ID System**: Maintains both better-auth ID (string/UUID) and mapping system ID (integer)
- **Profile Information**: Name, email, avatar image
- **Authentication State**: Email verification status
- **Immutable Design**: All updates create new instances

### Authentication vs Authorization

Currently, the domain focuses on:
- **Authentication**: User registration, login, and session management
- **Identity Management**: User profile and verification

Future extensions will add:
- **Authorization**: Roles, permissions, and access control
- **Organization Management**: Multi-tenancy support

## Architecture

### Repository Pattern

The domain uses repository interfaces to abstract data access:
- `UserRepository`: Defines all user data operations
- `BetterAuthUserRepository`: Concrete implementation using better-auth

This allows the domain to remain independent of the authentication provider.

### Service Layer

The `IAMService` provides the public API for the domain:
- User registration with validation
- Authentication operations
- User profile management
- ID translation between systems

### Integration Points

The IAM domain integrates with:
- **Better-Auth**: For authentication operations
- **User Mapping Service**: For legacy ID compatibility
- **tRPC API Layer**: Via service middleware

## Usage

### In tRPC Routers

```typescript
// Inject IAM service via middleware
export const userRouter = createTRPCRouter({
  register: publicProcedure
    .use(iamServiceMiddleware)
    .use(mappingServiceMiddleware)
    .input(registerSchema)
    .mutation(async ({ ctx, input }) => {
      // Create user via IAM domain
      const user = await ctx.iamService.register(input);
      
      // Orchestrate with other domains as needed
      const map = await ctx.mappingService.maps.createMap({
        userId: user.mappingId,
        title: `${user.displayName}'s Space`
      });
      
      return { user: ctx.iamService.userToContract(user), mapId: map.id };
    })
});
```

### Direct Service Usage (Testing)

```typescript
const repositories = { user: new MockUserRepository() };
const iamService = new IAMService(repositories);

const user = await iamService.register({
  email: "user@example.com",
  password: "securepassword",
  name: "Test User"
});
```

## Domain Operations

### User Registration
- Email validation and uniqueness check
- Password strength requirements
- Automatic mapping ID assignment
- Profile initialization

### User Authentication
- Email/password validation
- Session creation
- Returns both user and session data

### User Management
- Get user by various identifiers (ID, email, mapping ID)
- Update profile information
- Email verification

## Error Handling

The domain defines specific error types:
- `EmailAlreadyExistsError`: Duplicate registration attempt
- `InvalidCredentialsError`: Failed authentication
- `UserNotFoundError`: User lookup failures
- `WeakPasswordError`: Password validation failures

## Testing

The domain includes comprehensive unit tests:
- Entity validation and business rules
- Service operation flows
- Error scenarios
- Repository mocking patterns

## Future Extensions

The domain is designed to support:
1. **Role-Based Access Control (RBAC)**
   - Role entity and assignment
   - Permission checks
   - Policy-based authorization

2. **OAuth Providers**
   - Social login integration
   - Provider account linking

3. **Multi-Factor Authentication**
   - TOTP/SMS verification
   - Backup codes

4. **Organization Support**
   - Team/workspace management
   - Invitation flows

## Migration Notes

When migrating from direct better-auth usage:
1. Replace `authClient.signUp` with `trpc.user.register`
2. Use domain user IDs consistently
3. Let the API layer handle cross-domain orchestration
4. Leverage the repository pattern for testing