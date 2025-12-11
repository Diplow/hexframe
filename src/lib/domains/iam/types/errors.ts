/**
 * IAM Domain Errors
 * 
 * Domain-specific error types for the IAM domain.
 */

export class IAMError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "IAMError";
  }
}

export class UserNotFoundError extends IAMError {
  constructor(identifier: string) {
    super(`User not found: ${identifier}`, "USER_NOT_FOUND");
  }
}

export class EmailAlreadyExistsError extends IAMError {
  constructor(email: string) {
    super(`Email already registered: ${email}`, "EMAIL_ALREADY_EXISTS");
  }
}

export class InvalidCredentialsError extends IAMError {
  constructor() {
    super("Invalid email or password", "INVALID_CREDENTIALS");
  }
}

export class InvalidEmailError extends IAMError {
  constructor(email: string) {
    super(`Invalid email format: ${email}`, "INVALID_EMAIL");
  }
}

export class WeakPasswordError extends IAMError {
  constructor(reason: string) {
    super(`Password does not meet requirements: ${reason}`, "WEAK_PASSWORD");
  }
}

export class UnauthorizedError extends IAMError {
  constructor(message = "Unauthorized") {
    super(message, "UNAUTHORIZED");
  }
}

export class SessionExpiredError extends IAMError {
  constructor() {
    super("Session has expired", "SESSION_EXPIRED");
  }
}

// Favorites-related errors

export class DuplicateShortcutNameError extends IAMError {
  constructor(shortcutName: string) {
    super(
      `Shortcut name already exists: ${shortcutName}`,
      "DUPLICATE_SHORTCUT_NAME"
    );
  }
}

export class InvalidShortcutNameError extends IAMError {
  constructor(shortcutName: string) {
    super(
      `Invalid shortcut name: ${shortcutName}. Must contain only alphanumeric characters and underscores.`,
      "INVALID_SHORTCUT_NAME"
    );
  }
}

export class FavoriteNotFoundError extends IAMError {
  constructor(shortcutName: string) {
    super(`Favorite not found: ${shortcutName}`, "FAVORITE_NOT_FOUND");
  }
}