# Authentication System with `better-auth`

## Overview

This document outlines the authentication architecture implemented in this project. Authentication is primarily handled by the `better-auth` library, providing a flexible and robust solution for user management, session handling, and various authentication strategies.

The main goal for implementing authentication was to allow users to own their content within the application.

## Key Library: `better-auth`

`better-auth` was chosen for its comprehensive features, ease of integration with Next.js and tRPC, and its adapter system, particularly for Drizzle ORM. It provides both server-side and client-side utilities to manage the entire authentication lifecycle.

## Architecture Decisions & Implementation

The authentication system is built around `better-auth` and integrates with the existing Next.js, tRPC, and Drizzle stack.

### 1. Server-Side Configuration

- **Main Configuration (`src/server/auth.ts`):** This file initializes `better-auth` for the server.

  - It enables Email and Password authentication.
  - It configures the `drizzleAdapter` to connect `better-auth` with the PostgreSQL database via Drizzle ORM, mapping to our schema (e.g., `users`, `accounts`, `sessions`, `verificationTokens`).
  - An `AUTH_SECRET` environment variable is used for securing sessions.
  - The `basePath` for authentication API routes is set to `/api/auth`.

- **API Routes (`src/app/api/auth/[...all]/route.ts`):**

  - This Next.js dynamic API route exposes the `better-auth` request handlers (`GET`, `POST`). All authentication-related HTTP requests (e.g., login, logout, OAuth callbacks) are processed here. It uses the `auth` instance configured in `src/server/auth.ts`

### 2. Client-Side Configuration

- **Auth Client (`src/lib/auth/auth-client.ts`):**
  - `createAuthClient` from `better-auth/client` is used to initialize the client-side module.
  - The `baseURL` for the auth server is configured, defaulting to the application's domain but explicitly set for clarity and different environments (e.g., Vercel deployments).

### 3. tRPC Integration

- **tRPC Context (`src/server/api/trpc.ts`):**

  - The `createContext` function for tRPC is augmented to include the user's session information.
  - `auth.api.getSession()` (from the `better-auth` instance in `src/server/auth.ts`) is called on every request to retrieve the current session using request headers.
  - The session data (including the `user` object) is then available in `ctx.session` and `ctx.user` within tRPC procedures.

- **Protected Procedures (`src/server/api/trpc.ts`):**

  - A `protectedProcedure` is defined, which checks for the presence of `ctx.session` and `ctx.user`. If a user is not authenticated, a `TRPCError` with code `UNAUTHORIZED` is thrown, effectively protecting backend procedures.

- **Auth Router (`src/server/api/routers/auth.ts`):**
  - This tRPC router provides specific endpoints related to authentication:
    - `login`: Handles user login by calling `auth.api.signInEmail`.
    - `logout`: Handles user logout by calling `auth.api.signOut`.
    - `getSession`: A public procedure to retrieve the current session, primarily for client-side consumption.
    - `register`: Currently throws a `NOT_IMPLEMENTED` error, as registration is intended to be handled client-side via `authClient.signUp.email`.
  - A helper `convertToHeaders` is used to adapt Next.js request headers for `better-auth` API calls.

### 4. Frontend State Management

- **Auth Context (`src/contexts/AuthContext.tsx`):**
  - An `AuthProvider` component wraps the application (or parts of it) to provide authentication state.
  - It uses `authClient.useSession()` from `better-auth/client` to get the current session information (user, loading state).
  - A `useAuth` hook is provided for easy access to the `user` object and `isLoading` state in any component.

### 5. UI Components

- **Login & Registration Forms (`src/components/auth/LoginForm.tsx`, `src/components/auth/RegisterForm.tsx`):**

  - These React components provide the user interface for signing in and signing up.
  - They use methods from the `authClient` (`authClient.signIn.email` and `authClient.signUp.email`) to interact with the `better-auth` backend.
  - After successful operations, they typically invalidate the `auth.getSession` tRPC query to refresh the `AuthContext`.

- **Auth Tile (`src/app/map/Tile/Auth/auth.tsx`):**

  - A dynamically imported component that hosts the `LoginForm` and `RegisterForm`.
  - It allows users to switch between login and registration views.
  - This tile is likely intended to be displayed prominently when a user is not authenticated.

- **User Navigation (`src/components/layout/UserNav.tsx` - as per plan):**
  - This component would display user information and a logout button.
  - Logout is handled using `authClient.signOut()`.
  - (Note: `UserNav.tsx` does not exist yet. The `AuthTile` currently serves for login/registration, and further user navigation will be part of future UI development.)

### 6. Database Integration

- **Drizzle Schema (`src/server/db/schema/`):**
  - `better-auth` requires specific tables for its operation: `users`, `accounts`, `sessions`, and `verificationTokens` (or `verification`).
  - The `drizzleAdapter` in `src/server/auth.ts` maps `better-auth`'s expected schema names (singular) to our actual Drizzle table names (plural, e.g., `schema.users`, `schema.accounts`).
  - Existing tables like `hexMaps` have their `ownerId` field updated to reference the `users.id` table to associate data with authenticated users.

## Authentication Flow

1.  **Registration:**

    - The user fills out the `RegisterForm`.
    - `authClient.signUp.email` is called on the client-side.
    - `better-auth` handles user creation, password hashing, and potentially sends a verification email (depending on configuration).
    - The client's session is updated.
    - After registration, the user's map is also created and the user is redirected to their map.

2.  **Login:**

    - The user fills out the `LoginForm`.
    - `authClient.signIn.email` is called on the client-side, which makes a request to the `/api/auth/signin/email` endpoint handled by `better-auth`.
    - Alternatively, the `authRouter.login` tRPC procedure can be used, which internally calls `auth.api.signInEmail`.
    - `better-auth` verifies credentials and creates a session, typically setting HTTP-only cookies.
    - The client's session is updated.
    - After login, the user is redirected to their map.

3.  **Session Management:**

    - `better-auth` manages sessions using cookies.
    - On the client, `authClient.useSession()` provides reactive access to the current session state.
    - On the server (tRPC), `auth.api.getSession()` in `createContext` makes the session available.

4.  **Logout:**
    - The user clicks a logout button.
    - `authClient.signOut()` is called on the client-side, which requests `/api/auth/signout`.
    - Alternatively, the `authRouter.logout` tRPC procedure calls `auth.api.signOut`.
    - `better-auth` invalidates the session and clears cookies.
    - The client's session is updated.
    - (Note: Specific UI for logout button and post-logout redirection to be finalized.)

## User Map Flow

The application ensures every authenticated user has a workspace (map) through the following flow:

### Home Page Flow (`src/app/page.tsx`)

1. **Authentication Check**: 
   - The `useAuth` hook provides the current user state
   - Unauthenticated users see the welcome screen with login/signup options

2. **Map Discovery**:
   - Once authenticated, `getUserMap` query checks if the user has an existing map
   - Uses the mapping domain's user ID system (converts auth user ID to mapping user ID)

3. **Automatic Map Creation**:
   - If no map exists, `createDefaultMapForCurrentUser` mutation creates one
   - Default map is named "{userName}'s Map"
   - Creation happens transparently without user intervention

4. **Navigation**:
   - Users are automatically redirected to `/map?center={mapId}`
   - The map page becomes their primary workspace

### State Management

The flow is managed by `useUserMapFlow` hook which provides clear states:
- `loading`: Initial auth check
- `unauthenticated`: No user session
- `fetching_map`: Querying for user's map
- `creating_map`: Creating default map
- `redirecting`: Navigating to map
- `error`: Handle failures gracefully

This ensures a smooth onboarding experience where new users automatically get a workspace without manual setup.

## Key Files

- **Core `better-auth` Server Config:** `src/server/auth.ts`
- **`better-auth` Client Config:** `src/lib/auth/auth-client.ts`
- **API Route Handler:** `src/app/api/auth/[...all]/route.ts`
- **tRPC Auth Router:** `src/server/api/routers/auth.ts`
- **tRPC Context Enhancer:** `src/server/api/trpc.ts` (specifically `createContext`)
- **Frontend Auth Provider:** `src/contexts/AuthContext.tsx`
- **UI Forms:** `src/components/auth/LoginForm.tsx`, `src/components/auth/RegisterForm.tsx`
- **Auth UI Tile:** `src/app/map/Tile/Auth/auth.tsx`
- **Database Schema:** `src/server/db/schema/users.ts`, `accounts.ts`, etc.
- **User Map Flow:** `src/app/_hooks/use-user-map-flow.ts`, `src/app/page.tsx`
- **Feature Plan:** `issues/archive/features/2025-05-16-better-auth.md`, `issues/archive/features/2025-05-18-homepage.md` (for historical context and planning)

This setup provides a solid foundation for authentication, leveraging `better-auth` for core functionality while integrating smoothly with the project's tRPC and Next.js architecture.
