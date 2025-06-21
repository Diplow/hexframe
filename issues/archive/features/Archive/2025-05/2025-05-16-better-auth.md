# Feature plan: implement authentication with better-auth

## Problem

No one can own its content.

## Context

Read those files for a global understanding of the project architecture:

- README.md : a high level presentation of the project
- src/app/map/[id]/README.md : a presentation of the main page of the application and its structure
- src/server/README.md : a presentation of the backend server of the application and its structure
- src/lib/domains/mapping/README.md : a presentation of the mapping domain

## High Level Goal

1. Implement a simple authentication (password + email) with better-auth

## Implementation Plan

1.  **Package Installation and Setup:**

    - Install `better-auth` and any necessary peer dependencies.
    - Configure `better-auth` according to its documentation, setting up providers, callbacks, and session management.

2.  **Database Schema Extension:**

    - Define and create a new table (or extend an existing one if applicable, though likely new) to store user information (e.g., `users` table with `id`, `email`, `hashedPassword`, `createdAt`, `updatedAt`).
    - Ensure this schema integrates with `better-auth`'s requirements for user lookup.

3.  **Backend API Endpoints (tRPC Routers):**

    - Create tRPC procedures for user actions:
      - `auth.register(email, password)`: Handles new user sign-up.
      - `auth.login(email, password)`: Handles user sign-in and session creation.
      - `auth.logout()`: Handles user sign-out and session invalidation.
      - `auth.getSession()`: Retrieves the current user's session information.
    - Implement middleware to protect certain tRPC procedures, ensuring only authenticated users can access them.

4.  **Frontend UI Components:**

    - Develop React components for:
      - Registration Form (`<RegisterForm />`)
      - Login Form (`<LoginForm />`)
      - User Profile/Logout Button (e.g., in a navbar or user menu)
    - Create the special Tile to host these forms.

5.  **Frontend State Management & Routing:**

    - Implement a client-side mechanism (e.g., React Context) to manage the user's authentication state (e.g., current user, loading state).
    - Protect client-side routes so that certain pages are only accessible to authenticated users. Unauthenticated users attempting to access protected routes should be redirected to a login page.

6.  **Integration with Existing Features:**

    - Modify existing functionalities (e.g., map creation, editing) to associate data with the authenticated user. This will likely involve:
      - Updating relevant database schemas (e.g., change `ownerId` foreign key to the `hex-maps` table and update where it used today as constant).
      - Updating domain objects and repositories to handle user-specific data.
      - Ensuring that backend services and actions perform ownership checks.

## Implementation details

Here's a more granular breakdown for each step of the implementation plan, updated with insights from the `better-auth` documentation:

### 1. Package Installation and Setup

- **Install Package:**
  - Run `pnpm add better-auth`.
  - Check `better-auth` documentation ([https://www.better-auth.com/docs/basic-usage](https://www.better-auth.com/docs/basic-usage)) for any peer dependencies (e.g., bcrypt for password hashing, though `better-auth` might handle this internally) and install them.
- **Configuration (`src/lib/auth/auth.ts` or `src/server/auth.ts`):**

  - Create an `auth.ts` file to configure the `betterAuth` server instance.

    ```typescript
    import { betterAuth } from "better-auth";
    // Potentially import a Drizzle adapter if provided by better-auth or if one needs to be custom-built
    // import { DrizzleAdapter } from "@better-auth/drizzle-adapter"; // Hypothetical

    export const auth = betterAuth({
      emailAndPassword: {
        enabled: true,
        // autoSignIn: false // Optionally disable auto sign-in after registration (defaults to true)
      },
      // If using a database adapter:
      // db: DrizzleAdapter(drizzleClientInstance), // Pass your Drizzle client
      // Define other options like JWT secrets, cookie settings as per better-auth docs
      // e.g., secret: process.env.AUTH_SECRET
    });
    ```

  - **Environment Variables:** Add necessary secrets to your `.env` file (e.g., `AUTH_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` if using social OAuth).
  - **Client Setup (`src/lib/auth/auth-client.ts`):**

    ```typescript
    import { createAuthClient } from "better-auth/client";

    export const authClient = createAuthClient({
      // Client-side configuration if any
    });
    ```

### 2. Database Schema Extension

- **User Table Definition (`src/server/db/schema/users.ts`):**

  - Define the `users` table using Drizzle ORM. `better-auth` might have specific column expectations if not using a fully managed adapter, or its adapter might handle schema. The schema below is a common setup.

    ```typescript
    import {
      pgTable,
      serial,
      text,
      timestamp,
      varchar,
      // boolean, // if needed for fields like email_verified by better-auth
    } from "drizzle-orm/pg-core";

    export const users = pgTable("users", {
      id: serial("id").primaryKey(), // Or text('id').primaryKey() if using UUIDs preferred by better-auth
      email: varchar("email", { length: 255 }).unique().notNull(),
      hashedPassword: text("hashed_password").notNull(), // better-auth will handle hashing
      name: text("name"), // Optional, based on better-auth's signUp
      image: text("image"), // Optional, for profile pictures
      emailVerified: timestamp("email_verified", { mode: "date" }), // better-auth might manage this
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull(),
    });
    ```

  - **Important:** Check `better-auth` documentation for exact schema requirements or if it provides tools/plugins for schema generation/migration (e.g., `npx @better-auth/cli generate` or `migrate` mentioned for plugins). If `better-auth` handles user tables internally via an adapter, this step might be simpler.

- **Migrations:**
  - Generate a new migration: `pnpm drizzle-kit generate:pg --schema src/server/db/schema/index.ts`
  - Apply the migration: `pnpm drizzle-kit push:pg` (or `migrate`).
- **Relationships (Optional):**
  - The relation for `hexMaps.ownerId` to `users.id` will still be needed. Ensure `users.id` type matches `hexMaps.ownerId` type.

### 3. Backend API Endpoints (tRPC Routers)

- **Modify/Create Auth Service (`src/server/services/authService.ts` - might be less needed if `better-auth` server API is used directly in router):**
  - This layer would primarily wrap `better-auth`'s server-side API calls if complex pre/post processing is needed. Otherwise, tRPC procedures can call `auth.api` methods directly.
- **Create/Update Auth Router (`src/server/api/routers/auth.ts`):**

  ```typescript
  import { z } from "zod";
  import {
    createTRPCRouter,
    publicProcedure,
    // protectedProcedure, // Will use ctx.session to protect
  } from "~/server/api/trpc";
  import { auth } from "~/server/auth"; // Path to your betterAuth server instance
  import { TRPCError } from "@trpc/server";

  export const authRouter = createTRPCRouter({
    register: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(8),
          name: z.string().optional(), // As per better-auth docs
          image: z.string().url().optional(), // As per better-auth docs
        }),
      )
      .mutation(async ({ input, ctx }) => {
        // better-auth server-side signUp is not explicitly in the provided basic usage.
        // Typically, client-side authClient.signUp.email is used.
        // If a server-side equivalent exists or needs to be built (e.g. for admin actions):
        // const result = await auth.api.signUpEmail({ body: { email: input.email, password: input.password, name: input.name }, asResponse: true });
        // For now, assume registration is primarily client-driven as per docs.
        // This endpoint might be more for custom backend logic post-better-auth client registration if needed.
        // Or, if better-auth handles user creation on first signIn attempt with a new email.
        // We will rely on client-side signUp for now.
        // If direct server-side registration is required, consult better-auth docs for the method.
        // For this plan, we'll assume client-side handles registration.
        throw new TRPCError({
          code: "NOT_IMPLEMENTED",
          message: "Use client-side registration.",
        });
      }),

    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const response = await auth.api.signInEmail({
          body: {
            email: input.email,
            password: input.password,
          },
          req: ctx.req, // Pass request for cookie handling if asResponse is not true or for advanced cases
          // asResponse: true, // This returns a Response object. For tRPC, we need to manage data/cookies.
          // better-auth Next.js plugin might handle cookies automatically.
        });
        // If asResponse: true, you'd have to handle the Response object:
        // response.headers.forEach((val, key) => ctx.res.setHeader(key, val));
        // return await response.json();
        // If not using asResponse or if the Next.js plugin handles cookies:
        if (response.error) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: response.error.message,
          });
        }
        return response.data; // Contains user and session info
      }),

    logout: publicProcedure // Or protected if a session must exist
      .mutation(async ({ ctx }) => {
        // Server-side logout with better-auth:
        const response = await auth.api.signOut({
          req: ctx.req, // Pass request for cookie handling
          // asResponse: true, // Similar to login
        });
        // if (asResponse: true) handle response and cookies
        // if the Next.js plugin handles cookies:
        if (response.error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: response.error.message,
          });
        }
        return { success: true };
      }),

    getSession: publicProcedure.query(async ({ ctx }) => {
      // Session from tRPC context, populated by better-auth
      return ctx.session;
    }),
  });
  ```

- **tRPC Context Modification (`src/server/api/trpc.ts`):**

  ```typescript
  import { auth } from "~/server/auth"; // Path to your betterAuth server instance
  import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
  import { drizzle } from "drizzle-orm/postgres-js";
  import postgresClient from "~/server/db/postgres-client"; // Your DB client
  import * as schema from "~/server/db/schema";

  export const createContext = async (opts: CreateNextContextOptions) => {
    const { req, res } = opts;
    const session = await auth.api.getSession({
      headers: req.headers, // Pass NextApiRequest['headers']
      req: req, // Pass the full request for cookie handling by better-auth
    });

    const db = drizzle(postgresClient, { schema });
    return {
      req,
      res,
      db,
      session: session.data, // session.data contains the user session or null
      user: session.data?.user, // convenience
    };
  };
  ```

- **Protected Procedures (`src/server/api/trpc.ts`):**

  ```typescript
  // ... imports
  import { TRPCError } from "@trpc/server";

  // ...
  const t = initTRPC.context<typeof createContext>().create({
    // ...
  });
  // ...
  export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
    if (!ctx.session || !ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session },
        user: { ...ctx.user },
        db: ctx.db,
        req: ctx.req,
        res: ctx.res,
      },
    });
  });
  ```

### 4. Frontend UI Components

- **Import `authClient`:** Components will use `import { authClient } from '~/lib/auth/auth-client';`
- **Registration Form (`src/components/auth/RegisterForm.tsx`):**
  - Uses `authClient.signUp.email` method.
    ```typescript
    // Inside RegisterForm component
    const handleRegister = async (values: {
      email: string;
      password: string;
      name?: string;
    }) => {
      try {
        const { data, error } = await authClient.signUp.email(
          {
            email: values.email,
            password: values.password,
            name: values.name, // Optional
            // image: 'user-image-url', // Optional
            callbackURL: "/map", // Or wherever you want to redirect after email verification if applicable
          },
          {
            // onRequest: () => setLoading(true),
            onSuccess: (ctx) => {
              // console.log('Signed up and logged in:', ctx.data);
              // router.push(ctx.data.callbackURL || '/map'); // better-auth might auto-redirect
              // Or invalidate session query to update AuthContext
              utils.auth.getSession.invalidate();
            },
            onError: (ctx) => {
              // setError(ctx.error.message);
            },
          },
        );
        // Handle data/error
      } catch (err) {
        /* ... */
      }
    };
    ```
- **Login Form (`src/components/auth/LoginForm.tsx`):**
  - Uses `authClient.signIn.email` method.
    ```typescript
    // Inside LoginForm component
    const handleLogin = async (values: { email: string; password: string }) => {
      try {
        const { data, error } = await authClient.signIn.email(
          {
            email: values.email,
            password: values.password,
            // callbackURL: "/map", // Optional redirect after successful login
            // rememberMe: true, // Optional
          },
          {
            // onRequest, onSuccess, onError callbacks
            onSuccess: () => {
              utils.auth.getSession.invalidate(); // Update AuthContext
              // router.push('/map'); // Or rely on callbackURL / better-auth default
            },
          },
        );
        // Handle data/error
      } catch (err) {
        /* ... */
      }
    };
    ```
- **User Profile/Logout Button (`src/components/layout/UserNav.tsx` or similar):**
  - Uses `authClient.signOut()`.
    ```typescript
    // Inside UserNav component
    const { user } = useAuth(); // From AuthContext
    const handleLogout = async () => {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            // AuthContext will update via useSession or manual invalidation
            // router.push("/login"); // Or let AuthContext handle redirect
            utils.auth.getSession.invalidate();
          },
        },
      });
    };
    ```
- **Auth Tile (`src/app/map/[id]/Tile/auth.dynamic.tsx`):** (Path updated based on user's previous edit)
  - Conditionally renders `<LoginForm />` or `<RegisterForm />`.
  - This tile will be the center tile when no user is logged in, prompting for login/registration.

### 5. Frontend State Management & Routing

- **Auth Context (`src/contexts/AuthContext.tsx` or `src/providers/AuthProvider.tsx`):**

  - Utilize `authClient.useSession()` from `better-auth`.

    ```typescript
    import React, { createContext, useContext, ReactNode } from 'react';
    import { authClient } from '~/lib/auth/auth-client'; // Your auth client
    import { api } from '~/commons/trpc/react'; // Your tRPC API client for logout mutation if needed

    // Define User type based on what better-auth session returns
    interface User {
      id: string; // or number
      email: string;
      name?: string;
      image?: string;
      // other fields from better-auth session
    }

    interface AuthContextType {
      user: User | null | undefined; // undefined during loading, null if not logged in
      isLoading: boolean;
      // logout function can call tRPC or authClient.signOut()
      // and then ensure session is refetched or cleared.
    }

    const AuthContext = createContext<AuthContextType | undefined>(undefined);

    export const AuthProvider = ({ children }: { children: ReactNode }) => {
      const { data: session, isPending, error } = authClient.useSession();
      // const trpcUtils = api.useUtils(); // if using tRPC logout

      // const handleLogout = async () => {
      //   await authClient.signOut();
      //   // useSession should automatically update.
      //   // If using tRPC logout:
      //   // await logoutMutation.mutateAsync();
      //   // trpcUtils.auth.getSession.invalidate();
      // };

      return (
        <AuthContext.Provider value={{ user: session?.user, isLoading: isPending }}>
          {children}
        </AuthContext.Provider>
      );
    };

    export const useAuth = () => {
      const context = useContext(AuthContext);
      if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
      }
      return context;
    };
    ```

- **Integrate Provider:** Wrap `src/app/layout.tsx` with `<AuthProvider />`.
- **Route Protection (`src/components/auth/ProtectedPageWrapper.tsx`):**
  - Uses `useAuth()` to check `user` and `isLoading`.
  - Redirects to login if `!user && !isLoading`.

### 6. Integration with Existing Features

- **Schema Update (`src/server/db/schema/hex-map.ts`):**
  - Change `hexMaps.ownerId` to be a foreign key to `users.id`. Ensure the data type matches (e.g. `integer` if `users.id` is `serial`, or `text` if `users.id` is `text/uuid`).
    ```typescript
    // ... in hexMaps table definition
    // import { users } from './users';
    ownerId: integer('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    // OR if user ID is text/uuid
    // ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    ```
  - Regenerate and apply migrations.
- **Update `ownerId` Usage:**
  - In tRPC procedures (e.g., map creation), use `ctx.user.id` (from `ctx.session.user.id` via `createContext`).
- **Domain Objects & Repositories:**
  - Update types for `ownerId` if they changed (e.g. from string to number).
  - Actions and services will now use the authenticated user's ID for creation and ownership checks.
    ```typescript
    // Example in a tRPC mutation for creating a map
    // (assuming this is part of a larger router already using protectedProcedure or checking ctx.user)
    // .mutation(async ({ input, ctx }) => {
    //   if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
    //   const userId = ctx.user.id;
    //   // ... proceed to create map with userId as ownerId
    //   // const createdMap = await mapService.createMap({ ...input, ownerId: userId });
    //   // return createdMap;
    // });
    ```

This revised plan incorporates the specific API usage patterns from the `better-auth` documentation ([https://www.better-auth.com/docs/basic-usage](https://www.better-auth.com/docs/basic-usage)). Remember to thoroughly consult their docs for advanced configurations, error handling, and specific adapter implementations if you choose to use them.
