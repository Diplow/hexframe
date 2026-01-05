/**
 * Template Tiles Seed Script
 *
 * Seeds the built-in template tiles (system, user) at well-known coordinates.
 * This script is idempotent - running it multiple times will not create duplicates.
 *
 * Usage:
 *   pnpm tsx drizzle/seeds/templates.seed.ts
 *
 * Or with dotenv for local environment:
 *   dotenv -e .env -e .env.local -- tsx drizzle/seeds/templates.seed.ts
 *
 * Design reference: docs/features/TEMPLATES_AS_TILES.md
 */

import postgres from 'postgres'
import { SYSTEM_TEMPLATE } from '~/lib/domains/agentic/templates/_system-template'
import { USER_TEMPLATE } from '~/lib/domains/agentic/templates/_user-template'

// ==================== CONFIGURATION ====================

/**
 * Well-known user ID for system-owned templates.
 * This is Hexframe's internal system user that owns built-in templates.
 */
const SYSTEM_USER_ID = 'D1i4gEqbi01JWS2F6I7GUN8ekRiU2mjK'

/**
 * Well-known coordinates for the Templates organizational tile.
 * Built-in templates are stored as children of this tile.
 */
const TEMPLATES_PARENT_PATH = [1, 2] as const

/**
 * Item type for template tiles.
 * This is a custom item type (not part of the MapItemType enum).
 */
const TEMPLATE_ITEM_TYPE = 'template' as const

// ==================== TYPES ====================

interface BuiltinTemplateSpec {
  templateName: string
  title: string
  content: string
  direction: number
}

interface SeedResult {
  created: string[]
  updated: string[]
  skipped: string[]
}

interface ExistingTemplate {
  id: number
  coord_user_id: string
  path: string
  template_name: string
  ref_item_id: number
  content: string
}

/**
 * Built-in template specifications.
 * Each template is a child of the Templates organizational tile at TEMPLATES_PARENT_PATH.
 */
const BUILTIN_TEMPLATE_SPECS: readonly BuiltinTemplateSpec[] = [
  {
    templateName: 'system',
    title: 'System Task Template',
    content: SYSTEM_TEMPLATE,
    direction: 1,
  },
  {
    templateName: 'user',
    title: 'User Interlocutor Template',
    content: USER_TEMPLATE,
    direction: 2,
  },
] as const

// ==================== DATABASE CONNECTION ====================

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required')
  process.exit(1)
}

const sql = postgres(DATABASE_URL)

// ==================== SEED FUNCTIONS ====================

/**
 * Find context needed for seeding: parent ID and existing templates.
 */
async function _findSeedContext(): Promise<{
  parentId: number | null
  existingTemplates: Map<string, ExistingTemplate>
}> {
  const pathString = TEMPLATES_PARENT_PATH.join(',')

  const parentResult = await sql<Array<{ id: number }>>`
    SELECT id
    FROM vde_map_items
    WHERE coord_user_id = ${SYSTEM_USER_ID}
      AND coord_group_id = 0
      AND path = ${pathString}
    LIMIT 1
  `
  const parentId = parentResult[0]?.id ?? null

  const templatesResult = await sql<ExistingTemplate[]>`
    SELECT
      m.id,
      m.coord_user_id,
      m.path,
      m.template_name,
      m.ref_item_id,
      b.content
    FROM vde_map_items m
    JOIN vde_base_items b ON m.ref_item_id = b.id
    WHERE m.coord_user_id = ${SYSTEM_USER_ID}
      AND m.coord_group_id = 0
      AND m.item_type = ${TEMPLATE_ITEM_TYPE}
      AND m.template_name IS NOT NULL
  `

  const existingTemplates = new Map<string, ExistingTemplate>()
  for (const template of templatesResult) {
    existingTemplates.set(template.template_name, template)
  }

  return { parentId, existingTemplates }
}

/**
 * Create a new template tile (base item + map item).
 */
async function _createTemplate(
  spec: BuiltinTemplateSpec,
  parentId: number | null
): Promise<void> {
  const pathString = [...TEMPLATES_PARENT_PATH, spec.direction].join(',')

  const baseResult = await sql<Array<{ id: number }>>`
    INSERT INTO vde_base_items (title, content, created_at, updated_at)
    VALUES (${spec.title}, ${spec.content}, NOW(), NOW())
    RETURNING id
  `

  const baseItemId = baseResult[0]?.id
  if (baseItemId === undefined) {
    throw new Error(`Failed to create base item for template: ${spec.templateName}`)
  }

  await sql`
    INSERT INTO vde_map_items (
      coord_user_id, coord_group_id, path, item_type, visibility,
      parent_id, ref_item_id, template_name, created_at, updated_at
    )
    VALUES (
      ${SYSTEM_USER_ID}, 0, ${pathString}, ${TEMPLATE_ITEM_TYPE}, 'public',
      ${parentId}, ${baseItemId}, ${spec.templateName}, NOW(), NOW()
    )
  `
}

/**
 * Seed a single template: create new or update existing if content changed.
 */
async function _seedTemplate(
  spec: BuiltinTemplateSpec,
  existingTemplates: Map<string, ExistingTemplate>,
  parentId: number | null
): Promise<'created' | 'updated' | 'skipped'> {
  const existing = existingTemplates.get(spec.templateName)

  if (!existing) {
    await _createTemplate(spec, parentId)
    return 'created'
  }

  if (existing.content === spec.content) {
    return 'skipped'
  }

  await sql`
    UPDATE vde_base_items
    SET content = ${spec.content},
        title = ${spec.title},
        updated_at = NOW()
    WHERE id = ${existing.ref_item_id}
  `

  return 'updated'
}

/**
 * Main seed function: seeds all built-in templates.
 */
async function seedTemplates(): Promise<SeedResult> {
  const result: SeedResult = { created: [], updated: [], skipped: [] }

  console.log('Finding seed context...')
  const { parentId, existingTemplates } = await _findSeedContext()

  if (parentId === null) {
    console.warn('Templates organizational tile not found at path:', TEMPLATES_PARENT_PATH.join(','))
    console.warn('Template tiles will be created without a parent reference.')
  } else {
    console.log(`Found Templates parent tile with ID: ${parentId}`)
  }

  console.log(`Found ${existingTemplates.size} existing template tiles\n`)

  console.log('Seeding templates...')
  for (const spec of BUILTIN_TEMPLATE_SPECS) {
    const status = await _seedTemplate(spec, existingTemplates, parentId)

    switch (status) {
      case 'created':
        result.created.push(spec.templateName)
        console.log(`  + Created: ${spec.templateName}`)
        break
      case 'updated':
        result.updated.push(spec.templateName)
        console.log(`  ~ Updated: ${spec.templateName}`)
        break
      case 'skipped':
        result.skipped.push(spec.templateName)
        console.log(`  - Skipped: ${spec.templateName} (unchanged)`)
        break
    }
  }

  return result
}

/**
 * Entry point.
 */
async function main() {
  console.log('='.repeat(60))
  console.log('Template Tiles Seed Script')
  console.log('='.repeat(60))
  console.log()
  console.log(`System User ID: ${SYSTEM_USER_ID}`)
  console.log(`Templates Parent Path: ${TEMPLATES_PARENT_PATH.join(',')}`)
  console.log(`Templates to seed: ${BUILTIN_TEMPLATE_SPECS.map(s => s.templateName).join(', ')}`)
  console.log()

  try {
    const result = await seedTemplates()

    console.log()
    console.log('='.repeat(60))
    console.log('Summary')
    console.log('='.repeat(60))
    console.log(`  Created: ${result.created.length} (${result.created.join(', ') || 'none'})`)
    console.log(`  Updated: ${result.updated.length} (${result.updated.join(', ') || 'none'})`)
    console.log(`  Skipped: ${result.skipped.length} (${result.skipped.join(', ') || 'none'})`)
    console.log()

    if (result.created.length > 0 || result.updated.length > 0) {
      console.log('Seed completed successfully!')
    } else {
      console.log('No changes needed. All templates are up to date.')
    }
  } catch (error) {
    console.error('Seed failed:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

main()
