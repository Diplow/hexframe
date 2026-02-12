/**
 * Template Allowlist Service (TDD Stub)
 *
 * Validates that users can only execute templates they have explicitly allowed.
 * Implements the User Template Allowlist Enforcement feature.
 *
 * See: docs/features/TEMPLATES_AS_TILES.md for feature specification
 *
 * TODO: Implement this service - tests are written in __tests__/template-allowlist.service.test.ts
 */

// ==================== CONSTANTS ====================

/**
 * Built-in templates that are always allowed for all users.
 * These correspond to the core tile types in Hexframe.
 */
export const BUILT_IN_TEMPLATES: readonly string[] = Object.freeze([
  'system',
  'user',
  'organizational',
  'context'
])

// ==================== TYPES ====================

/**
 * Visibility options for tiles and templates.
 */
export type Visibility = 'public' | 'private'

/**
 * User's template allowlist configuration.
 */
export interface UserAllowlist {
  userId: string
  allowedTemplates: string[]
}

// ==================== ERRORS ====================

/**
 * Error thrown when a user attempts to use a template not in their allowlist.
 */
export class TemplateNotAllowedError extends Error {
  constructor(
    public readonly templateName: string,
    public readonly userId: string | null,
    public readonly allowedTemplates: string[]
  ) {
    super(`Template "${templateName}" is not allowed for user "${userId}"`)
    this.name = 'TemplateNotAllowedError'
  }
}

/**
 * Error thrown when a public tile attempts to use a private template.
 */
export class TemplateVisibilityError extends Error {
  constructor(
    public readonly templateName: string,
    public readonly tileVisibility: Visibility,
    public readonly templateVisibility: Visibility
  ) {
    super(`Cannot use private template "${templateName}" for public tile`)
    this.name = 'TemplateVisibilityError'
  }
}

// ==================== REPOSITORY INTERFACE ====================

/**
 * Repository interface for template allowlist queries.
 */
export interface TemplateAllowlistRepository {
  getUserAllowlist(userId: string): Promise<UserAllowlist | null>
  saveUserAllowlist(allowlist: UserAllowlist): Promise<void>
  getTemplateVisibility(templateName: string): Promise<Visibility>
}

// ==================== SERVICE ====================

/**
 * Service for validating user template allowlists.
 *
 * Provides methods to:
 * - Validate if a user can use a specific template
 * - Check if a template is built-in
 * - Get a user's effective allowlist (built-in + custom)
 * - Validate visibility constraints between tiles and templates
 */
export class TemplateAllowlistService {
  constructor(private readonly _repository: TemplateAllowlistRepository) {}

  /**
   * Validate that a user is allowed to use a specific template.
   *
   * @param userId - The user ID (null for anonymous users)
   * @param templateName - The template name to validate
   * @throws TemplateNotAllowedError if template is not allowed
   * @throws Error for invalid input (empty, whitespace-only)
   */
  async validateAllowlist(userId: string | null | undefined, templateName: string): Promise<void> {
    this._validateTemplateName(templateName)

    if (this.isBuiltInTemplate(templateName)) {
      return
    }

    const isAnonymousUser = userId === null || userId === undefined
    if (isAnonymousUser) {
      throw new TemplateNotAllowedError(templateName, null, [...BUILT_IN_TEMPLATES])
    }

    const effectiveAllowlist = await this.getEffectiveAllowlist(userId)
    const normalizedTemplateName = templateName.toLowerCase()
    const isTemplateAllowed = effectiveAllowlist.some(
      allowedTemplate => allowedTemplate.toLowerCase() === normalizedTemplateName
    )

    if (!isTemplateAllowed) {
      throw new TemplateNotAllowedError(templateName, userId, effectiveAllowlist)
    }
  }

  /**
   * Check if a template is a built-in template.
   * Built-in templates are always allowed for all users.
   *
   * @param templateName - The template name to check
   * @returns true if the template is built-in
   */
  isBuiltInTemplate(templateName: string): boolean {
    const normalizedTemplateName = templateName.toLowerCase()
    return BUILT_IN_TEMPLATES.some(
      builtInTemplate => builtInTemplate.toLowerCase() === normalizedTemplateName
    )
  }

  /**
   * Get the user's custom allowlist (without built-in templates).
   *
   * @param userId - The user ID (null for anonymous users)
   * @returns The user's custom allowed templates, or built-in templates for anonymous
   */
  async getUserAllowlist(userId: string | null | undefined): Promise<string[]> {
    const isAnonymousUser = userId === null || userId === undefined
    if (isAnonymousUser) {
      return [...BUILT_IN_TEMPLATES]
    }

    const userAllowlist = await this._repository.getUserAllowlist(userId)
    if (!userAllowlist) {
      return [...BUILT_IN_TEMPLATES]
    }

    return userAllowlist.allowedTemplates
  }

  /**
   * Get the user's effective allowlist (built-in + custom templates).
   *
   * @param userId - The user ID (null for anonymous users)
   * @returns Combined list of all allowed templates
   */
  async getEffectiveAllowlist(userId: string | null | undefined): Promise<string[]> {
    const isAnonymousUser = userId === null || userId === undefined
    if (isAnonymousUser) {
      return [...BUILT_IN_TEMPLATES]
    }

    const userAllowlist = await this._repository.getUserAllowlist(userId)
    const customTemplates = userAllowlist?.allowedTemplates ?? []

    const combinedTemplates = [...BUILT_IN_TEMPLATES]
    for (const customTemplate of customTemplates) {
      const normalizedCustomTemplate = customTemplate.toLowerCase()
      const isDuplicate = combinedTemplates.some(
        existingTemplate => existingTemplate.toLowerCase() === normalizedCustomTemplate
      )
      if (!isDuplicate) {
        combinedTemplates.push(customTemplate)
      }
    }

    return combinedTemplates
  }

  /**
   * Validate that a tile's visibility is compatible with its template's visibility.
   * Public tiles cannot use private templates (transparency principle).
   *
   * @param templateName - The template name
   * @param tileVisibility - The tile's visibility
   * @param templateVisibility - The template's visibility
   * @throws TemplateVisibilityError if public tile uses private template
   */
  async validateVisibility(
    templateName: string,
    tileVisibility: Visibility,
    templateVisibility: Visibility
  ): Promise<void> {
    const isPublicTileUsingPrivateTemplate =
      tileVisibility === 'public' && templateVisibility === 'private'

    if (isPublicTileUsingPrivateTemplate) {
      throw new TemplateVisibilityError(templateName, tileVisibility, templateVisibility)
    }
  }

  /**
   * Validate that the template name is valid (not empty or whitespace-only).
   */
  private _validateTemplateName(templateName: string): void {
    if (!templateName || templateName.trim() === '') {
      throw new Error('Template name cannot be empty or whitespace-only')
    }
  }
}
