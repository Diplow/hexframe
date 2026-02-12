/**
 * Template Resolver Service
 *
 * Resolves template tiles by name from the database.
 * Used by buildPrompt() to retrieve template content for {{@TemplateName}} expansion.
 */

// ==================== TYPES ====================

/**
 * Data structure for a template tile.
 */
export interface TemplateData {
  templateName: string
  title: string
  content: string
  coords: string
}

/**
 * Template with its structural children (sub-templates).
 */
export interface TemplateWithChildren extends TemplateData {
  subTemplates: TemplateData[]
}

// ==================== ERRORS ====================

/**
 * Error thrown when a template is not found by name.
 */
export class TemplateNotFoundError extends Error {
  constructor(templateName: string) {
    super(`Template "${templateName}" not found`)
    this.name = 'TemplateNotFoundError'
  }
}

// ==================== REPOSITORY INTERFACE ====================

/**
 * Repository interface for template queries.
 * Implementations should query map_items WHERE templateName = ? AND itemType = 'template'.
 */
export interface TemplateRepository {
  findByTemplateName(templateName: string): Promise<TemplateData | null>
  findByTemplateNameWithChildren(templateName: string): Promise<TemplateWithChildren | null>
}

// ==================== SERVICE ====================

/**
 * Service for resolving template tiles by name.
 *
 * Provides methods to:
 * - Look up a template by its templateName
 * - Look up a template with its structural children (sub-templates)
 */
export class TemplateResolverService {
  constructor(private readonly repository: TemplateRepository) {}

  /**
   * Get template data by name.
   *
   * @param templateName - The template name to look up
   * @returns The template data
   * @throws TemplateNotFoundError if template does not exist
   * @throws Error for invalid input (empty, whitespace-only, null, undefined)
   */
  async getTemplateByName(templateName: string): Promise<TemplateData> {
    this._validateTemplateName(templateName)

    const templateData = await this.repository.findByTemplateName(templateName)

    if (templateData === null) {
      throw new TemplateNotFoundError(templateName)
    }

    return templateData
  }

  /**
   * Get template data with its structural children (sub-templates).
   *
   * @param templateName - The template name to look up
   * @returns The template with its sub-templates
   * @throws TemplateNotFoundError if template does not exist
   * @throws Error for invalid input (empty, whitespace-only, null, undefined)
   */
  async getTemplateWithSubTemplates(templateName: string): Promise<TemplateWithChildren> {
    this._validateTemplateName(templateName)

    const templateWithChildren = await this.repository.findByTemplateNameWithChildren(templateName)

    if (templateWithChildren === null) {
      throw new TemplateNotFoundError(templateName)
    }

    return templateWithChildren
  }

  /**
   * Validate that the template name is valid.
   *
   * @param templateName - The template name to validate
   * @throws Error if template name is invalid
   */
  private _validateTemplateName(templateName: string): void {
    if (templateName === null || templateName === undefined) {
      throw new Error('Template name cannot be null or undefined')
    }

    if (typeof templateName !== 'string') {
      throw new Error('Template name must be a string')
    }

    if (templateName.length === 0) {
      throw new Error('Template name cannot be empty')
    }

    if (templateName.trim().length === 0) {
      throw new Error('Template name cannot be whitespace only')
    }
  }
}
