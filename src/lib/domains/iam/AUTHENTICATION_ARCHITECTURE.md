# IAM Domain Authentication Architecture

## Overview

This document explains the clean separation between the IAM domain and better-auth for authentication in Hexframe.

## Architecture Principles

### 1. **Clear Separation of Concerns**

- **IAM Domain**: User management, credential validation, business logic
- **Better-Auth**: Session management, cookies, JWT tokens, HTTP auth endpoints
- **API Layer**: Orchestrates between domains

### 2. **Domain Boundaries**

#### IAM Domain Responsibilities
- User entity management
- Credential validation (via better-auth internally)
- User profile operations
- Business rules (password strength, email validation)
- Mapping ID management

#### Better-Auth Responsibilities
- Session creation/destruction
- Cookie management
- JWT token generation
- HTTP authentication endpoints (`/api/auth/*`)
- Password hashing/verification

#### API Layer (tRPC/Server Actions) Responsibilities
- Orchestrate authentication flows
- Combine IAM user validation with better-auth session creation
- Handle cross-domain operations (e.g., create user + create default map)

## Authentication Flow

### Login Flow
```typescript
// 1. Client calls API layer
await api.user.login.mutate({ email, password })

// 2. API layer orchestrates:
//    a. IAM domain validates credentials
const user = await iamService.login({ email, password })

//    b. Better-auth creates session
const response = await auth.api.signInEmail({ email, password })

//    c. Forward session cookies
ctx.res.setHeader('Set-Cookie', response.headers.getSetCookie())

//    d. Return user data (session is in cookies)
return { user: user.toContract() }
```

### Registration Flow
```typescript
// 1. Client calls API layer
await api.user.register.mutate({ email, password, name })

// 2. API layer orchestrates:
//    a. IAM domain creates user
const user = await iamService.register({ email, password, name })

//    b. Other domains create resources
const mapId = await mappingService.createDefaultMap(user.mappingId)

//    c. Better-auth creates session (auto-login)
const response = await auth.api.signInEmail({ email, password })

//    d. Return orchestrated result
return { user: user.toContract(), defaultMapId: mapId }
```

## Frontend Integration

### AuthContext
- Uses better-auth's `authClient.useSession` atom for reactive session state
- Provides `user`, `mappingUserId`, `isLoading` to components
- Read-only observer of session state

### Authentication Methods
- **Direct better-auth**: Used for logout (`authClient.signOut()`)
- **tRPC mutations**: Used for login/register with business logic
- **Server Actions**: Alternative API for environments needing special cookie handling

## Benefits

1. **Clean Architecture**: Each system has single responsibility
2. **Testability**: Can mock each service independently
3. **Flexibility**: Easy to swap authentication providers
4. **Type Safety**: Strong typing throughout the stack
5. **Security**: Better-auth handles all security-critical operations

## Migration Notes

The codebase is transitioning from mixed authentication patterns to this clean architecture:
- Legacy: Direct `authClient.signIn.email()` calls
- Current: Orchestration through API layer
- Future: All auth operations through domain services