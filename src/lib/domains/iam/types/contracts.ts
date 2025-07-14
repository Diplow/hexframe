/**
 * IAM Domain Contracts
 * 
 * DTOs and API contracts for the IAM domain.
 * These types define the shape of data at API boundaries.
 */

export interface UserContract {
  id: string;
  email: string;
  name?: string;
  displayName: string;
  emailVerified: boolean;
  image?: string;
  mappingId: number;
  createdAt: string; // ISO string for JSON serialization
  updatedAt: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface RegisterResult {
  user: UserContract;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  user: UserContract;
}

export interface UpdateProfileInput {
  name?: string;
  image?: string;
}

export interface GetUserByIdInput {
  id: string;
}

export interface GetUserByEmailInput {
  email: string;
}

export interface GetUserByMappingIdInput {
  mappingId: number;
}