export class AgenticError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message)
    this.name = 'AgenticError'
  }
}

export class LLMProviderError extends AgenticError {
  constructor(message: string, public readonly provider: string) {
    super(message, 'LLM_PROVIDER_ERROR', 502)
  }
}

export class RateLimitError extends AgenticError {
  constructor(
    public readonly retryAfter?: number,
    public readonly provider?: string
  ) {
    super(
      `Rate limit exceeded${retryAfter ? `, retry after ${retryAfter}s` : ''}`,
      'RATE_LIMIT_ERROR',
      429
    )
  }
}

export class TokenLimitError extends AgenticError {
  constructor(
    public readonly tokenCount: number,
    public readonly tokenLimit: number
  ) {
    super(
      `Token limit exceeded: ${tokenCount} > ${tokenLimit}`,
      'TOKEN_LIMIT_ERROR',
      400
    )
  }
}

export class InvalidApiKeyError extends AgenticError {
  constructor(provider: string) {
    super(
      `Invalid API key for provider: ${provider}`,
      'INVALID_API_KEY',
      401
    )
  }
}

export class SecurityError extends AgenticError {
  constructor(
    message: string,
    public readonly threatType?: string
  ) {
    super(message, 'SECURITY_ERROR', 403)
  }
}

export class ContextBuildError extends AgenticError {
  constructor(message: string) {
    super(message, 'CONTEXT_BUILD_ERROR', 500)
  }
}