# Server Directory (`src/server`)

This directory contains all the backend logic for the Project VDE application. It's responsible for handling API requests, interacting with the database, and managing server-side operations.

## Key Components:

### 1. `api/`

This subdirectory houses the tRPC API implementation. tRPC allows for building type-safe APIs easily.

- **`root.ts`**: This is the main entry point for the tRPC API, where all the individual routers are combined into a single `appRouter`.
- **`trpc.ts`**: Contains the core tRPC setup, including context creation (e.g., `createTRPCContext`), middleware (like timing or service-specific middleware such as `mappingServiceMiddleware`), and procedure helpers (`publicProcedure`, `protectedProcedure`).
- **`routers/`**: This directory holds the specific routers for different parts of your API. For example, `map.ts` defines routes related to map operations (creating, fetching, updating maps and map items).
- **`types/`**: Includes API-specific type definitions and adapters. For instance, `contracts.ts` provides functions to adapt domain layer contract types to API response types (e.g., `mapItemContractToApiAdapter`, `mapContractToApiAdapter`).
- **`CACHING.md`**: A markdown file detailing the caching strategies employed for the HexMap application, particularly focusing on tRPC middleware and route handler caching.

### 2. `db/`

This subdirectory is responsible for all database-related concerns, primarily using Drizzle ORM for interacting with the PostgreSQL database.

- **`index.ts`**: Initializes and exports the Drizzle ORM instance (`db`) connected to the PostgreSQL database. It determines the correct database URL based on the environment (e.g., test or production).
- **`schema/`**: Defines the database schema.
  - **`_tables/`**: Contains individual Drizzle schema definitions for each database table (e.g., `base-items.ts`, `hex-maps.ts`, `map-items.ts`). These files define the columns, types, and constraints for each table.
  - **`_relations.ts`**: Defines the relationships (e.g., one-to-one, one-to-many) between the database tables using Drizzle's `relations` helper. This is crucial for querying related data.
  - **`_utils.ts`**: Provides utility functions for schema creation, such as `createTable` which might add a prefix to table names to avoid conflicts.
  - **`index.ts`**: Serves as the central export point for all schema components (tables and relations).
  - **`types.ts`**: (Potentially, or managed within individual table files) Exports TypeScript types inferred from the Drizzle schemas, allowing for type-safe database interactions throughout the application.

## Overall Architecture:

The server is built following a typical Next.js backend structure, enhanced with tRPC for robust API development and Drizzle for modern database management. The API layer serves as a Backend-for-Frontend (BFF), directly providing data in the shape needed by the frontend components.

### API Layer Responsibilities

The tRPC API layer has a critical architectural responsibility: **orchestrating operations across multiple domains**. This is a fundamental principle of our architecture:

#### Domain Orchestration

**The API layer is the ONLY place where multiple domains can be coordinated.** Domains themselves must remain completely independent of each other.

```typescript
// Example: User registration flow orchestrating IAM and Mapping domains
export const userRouter = createTRPCRouter({
  register: publicProcedure
    .use(iamServiceMiddleware)      // Inject IAM domain service
    .use(mappingServiceMiddleware)   // Inject Mapping domain service
    .input(registerSchema)
    .mutation(async ({ ctx, input }) => {
      // Step 1: Create user via IAM domain
      const user = await ctx.iamService.register({
        email: input.email,
        password: input.password,
        name: input.name
      });
      
      // Step 2: Create default map via Mapping domain
      const map = await ctx.mappingService.maps.createMap({
        userId: user.mappingId,
        title: `${user.name}'s Space`,
        descr: "Personal workspace"
      });
      
      // Step 3: Return combined result
      return {
        user: user.toContract(),
        defaultMapId: map.id
      };
    })
});
```

#### Key Principles:

1. **Domain Independence**: Domains never call each other directly
2. **API Orchestration**: tRPC routers coordinate multi-domain workflows
3. **Service Injection**: Use middleware to inject domain services into context
4. **Contract Transformation**: Convert domain objects to API contracts
5. **Transaction Boundaries**: API layer manages cross-domain transactions when needed

#### Benefits:

- **Flexibility**: Easy to create different workflows for different use cases
- **Testability**: Test domain logic and orchestration logic separately
- **Maintainability**: Changes to workflows don't affect domain logic
- **Scalability**: Domains can be split into separate services if needed

### Service Architecture

Services (like `MappingService` injected via middleware) encapsulate business logic within their domain, interacting with repositories that abstract database operations. The services expose domain operations to the API layer but never interact with other domain services directly.
