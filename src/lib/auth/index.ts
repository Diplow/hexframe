/**
 * Auth Subsystem Interface
 * 
 * Public API for authentication functionality.
 * All external imports should use this interface.
 */

export { authClient } from '~/lib/auth/auth-client';
// Re-export types from better-auth
export type { Session, User } from 'better-auth/types';