# IAM Domain

## Mental Model
Like a hotel's front desk and security system - handles guest check-ins, verifies identities, manages guest records, and provides room keys for access throughout the property.

## Responsibilities
- User authentication (login, registration, password verification) through IAMService
- User identity management (profiles, email verification, display names) via User entity
- User-to-mapping ID translation for backward compatibility with legacy systems
- Session orchestration through better-auth integration and server actions
- Domain-specific validation and error handling for authentication flows

## Non-Responsibilities
- Map/item permissions and authorization → See `~/lib/domains/mapping/README.md`
- User content and data storage → See `~/lib/domains/mapping/README.md`
- UI/presentation logic → See `~/src/app/` layers
- Authentication provider implementations → See `./infrastructure/README.md`
- Core business services and orchestration → See `./services/README.md`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.