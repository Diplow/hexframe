/**
 * User Entity
 * 
 * Core domain entity representing a user in the IAM domain.
 * This entity wraps better-auth user data while providing domain-specific
 * behavior and maintaining compatibility with the mapping system.
 */

export interface UserProps {
  id: string; // Better-auth user ID (UUID)
  email: string;
  name?: string;
  emailVerified: boolean;
  image?: string;
  mappingId: number; // Legacy mapping system ID
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserProps {
  id: string;
  email: string;
  name?: string;
  emailVerified?: boolean;
  image?: string;
  mappingId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(props: CreateUserProps): User {
    // Domain validation
    if (!props.email || !this.isValidEmail(props.email)) {
      throw new Error(`Invalid email: ${props.email}`);
    }

    if (!props.id) {
      throw new Error("User ID is required");
    }

    if (typeof props.mappingId !== "number" || props.mappingId <= 0) {
      throw new Error("Valid mapping ID is required");
    }

    return new User({
      id: props.id,
      email: props.email.toLowerCase(),
      name: props.name?.trim(),
      emailVerified: props.emailVerified ?? false,
      image: props.image,
      mappingId: props.mappingId,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    });
  }

  // Getters for accessing properties
  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get name(): string | undefined {
    return this.props.name;
  }

  get displayName(): string {
    return this.props.name ?? this.props.email.split("@")[0] ?? this.props.email;
  }

  get emailVerified(): boolean {
    return this.props.emailVerified;
  }

  get image(): string | undefined {
    return this.props.image;
  }

  get mappingId(): number {
    return this.props.mappingId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Domain methods
  updateProfile(updates: { name?: string; image?: string }): User {
    const updatedProps = {
      ...this.props,
      name: updates.name?.trim() ?? this.props.name,
      image: updates.image ?? this.props.image,
      updatedAt: new Date(),
    };

    return new User(updatedProps);
  }

  verifyEmail(): User {
    if (this.props.emailVerified) {
      return this; // Already verified, no change needed
    }

    return new User({
      ...this.props,
      emailVerified: true,
      updatedAt: new Date(),
    });
  }

  // Validation helpers
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Conversion for persistence/API
  toJSON(): UserProps {
    return { ...this.props };
  }
}