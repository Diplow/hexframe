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