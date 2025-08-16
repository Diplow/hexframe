# IAM Domain

## Why This Exists
The IAM (Identity and Access Management) domain handles all authentication, authorization, and user identity concerns within Hexframe. It provides a clean abstraction over authentication providers and ensures consistent user management across the system.

## Mental Model
The gatekeeper and identity provider for all user-related operations in Hexframe.

## Core Responsibility
This domain owns:
- User authentication (login, registration, password verification)
- User identity management (profiles, verification status)
- User-to-mapping ID translation for backward compatibility
- Session management through better-auth integration

This domain does NOT own:
- Map/item permissions (delegated to mapping domain)
- User content (delegated to mapping domain)
- UI/presentation logic (delegated to app layer)

## Public API
See `interface.ts` for the public API. Main capabilities:
- `IAMService` - Core service for authentication operations
- `User` - Domain entity representing a user
- `loginAction` - Server action for user login
- `registerAction` - Server action for user registration
- Repository interfaces and types

## Dependencies
See `dependencies.json` for allowed imports.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for structure details.