# Agentic Templates

## Mental Model

The Templates subsystem is a "prompt factory" that transforms tile hierarchies into execution-ready XML prompts. Given structured data about a task (its ancestors, context children, subtasks, and hexplan), it selects the appropriate Mustache template based on the tile's `itemType` and renders it into a prompt that AI agents can execute.

Think of it like a document generator: you provide the data, it picks the right template, and outputs a formatted document ready for consumption.

## Responsibilities

- Select appropriate Mustache template based on `MapItemType` (SYSTEM, USER, CONTEXT, ORGANIZATIONAL)
- Transform `PromptData` into template-ready data structures
- Build XML sections for ancestors, context, subtasks, task, and hexplan
- Escape XML special characters to prevent injection
- Render templates using Mustache and clean up whitespace
- Enforce template availability (throw clear errors for unimplemented types)

## Non-Responsibilities

- Fetching tile data from database → See `~/lib/domains/mapping/services`
- Resolving hexplan content → See `~/server/api/routers/agentic.ts`
- Streaming LLM responses → See `~/lib/domains/agentic/services`
- Hexplan generation logic → See `~/lib/domains/agentic/utils/prompt-builder.ts`
- Template tile CRUD operations → See `~/lib/domains/agentic/services/template-resolver.service.ts`

## Built-in Templates

Built-in templates are stored as database tiles at well-known coordinates, making them inspectable and modifiable. This follows the "Templates as Tiles" design (see `docs/features/TEMPLATES_AS_TILES.md`).

### Well-Known Coordinates

| Template | Location | Description |
|----------|----------|-------------|
| System User ID | `D1i4gEqbi01JWS2F6I7GUN8ekRiU2mjK` | Internal system user that owns built-in templates |
| Templates Parent | `D1i4gEqbi01JWS2F6I7GUN8ekRiU2mjK,0:1,2` | Organizational tile containing all templates |
| System Template | `D1i4gEqbi01JWS2F6I7GUN8ekRiU2mjK,0:1,2,1` | SYSTEM tile execution template |
| User Template | `D1i4gEqbi01JWS2F6I7GUN8ekRiU2mjK,0:1,2,2` | USER interlocutor template |

### Template Tile Structure

Template tiles use a special `itemType: "template"` and include:
- `title`: Human-readable name (e.g., "System Task Template")
- `content`: Mustache template markup
- `templateName`: Lookup identifier (e.g., "system", "user")
- `visibility`: "public" (templates are globally accessible)

### Available Templates

**SYSTEM Template** (`_system-template.ts`)
- Used for executable task tiles
- Renders: hexrun-intro, ancestor-context, context, subtasks, task, hexplan
- Supports iterative hexrun execution pattern

**USER Template** (`_user-template.ts`)
- Used for user root tiles (interlocutor mode)
- Renders: user-intro, context, sections, recent-history, discussion, user-message
- Optimized for conversational interaction

**HEXRUN Orchestrator Template** (`_hexrun-orchestrator-template.ts`)
- Triggered when SYSTEM tiles are executed via @-mention in chat
- Wraps task execution in an orchestration loop using MCP tools

### Seeding Built-in Templates

Templates are seeded to the database using a dedicated script:

```bash
# With environment variables loaded
dotenv -e .env -e .env.local -- pnpm tsx drizzle/seeds/templates.seed.ts

# Or if DATABASE_URL is already set
pnpm tsx drizzle/seeds/templates.seed.ts
```

The seed script is **idempotent**:
- Creates new templates if they do not exist
- Updates existing templates if content has changed
- Skips templates that are already up-to-date

See `drizzle/seeds/templates.seed.ts` for implementation details.

## Interface

**Public API** (see `index.ts`):

```typescript
// Build execution-ready XML prompt from task data
function buildPrompt(data: PromptData): string

// Orchestrator functions (for @-mention triggered execution)
function shouldUseOrchestrator(itemType: MapItemType, userMessage: string | undefined): boolean
function buildOrchestratorPrompt(data: OrchestratorPromptInput): string

// Input data structure
interface PromptData {
  task: { title: string; content: string | undefined; coords: string }
  ancestors: Array<{ title: string; content: string | undefined; coords: string }>
  composedChildren: Array<{ title: string; content: string; coords: string }>
  structuralChildren: Array<{ title: string; preview: string | undefined; coords: string }>
  hexPlan: string
  mcpServerName: string
  allLeafTasks?: Array<{ title: string; coords: string }>
  itemType: MapItemType  // Required - determines which template to use
  discussion?: string    // For USER tiles and orchestrator
  userMessage?: string   // Triggers orchestrator mode for SYSTEM tiles
}
```

**Dependencies** (see `dependencies.json`):
- `mustache` - Template rendering engine
- `~/lib/domains/mapping` - For `MapItemType` enum

## File Structure

```
templates/
├── index.ts                  # Public API exports
├── _prompt-builder.ts        # Core implementation (template lookup, rendering)
├── _system-template.ts       # SYSTEM tile template and data types
├── _user-template.ts         # USER tile template and data types
├── _hexrun-orchestrator-template.ts  # @-mention orchestration template
├── _pre-processor/           # {{@Template}} tag expansion
│   ├── index.ts
│   ├── _parser.ts
│   └── _resolver.ts
├── _templates/               # Rendering primitive functions
│   ├── index.ts              # Template registry
│   ├── _generic-tile.ts      # GenericTile() renderer
│   ├── _folder.ts            # Folder() renderer
│   ├── _tile-or-folder.ts    # TileOrFolder() renderer
│   └── _hexplan.ts           # HexPlan() renderer
├── _internals/               # Shared utilities
│   ├── types.ts              # PromptData and related types
│   ├── utils.ts              # XML escaping, content checks
│   └── section-builders.ts   # Context/subtask/ancestor section builders
└── __tests__/                # Test files
```

## Pre-processor Tags

The pre-processor expands special tags before Mustache rendering:

| Tag | Description |
|-----|-------------|
| `{{@HexPlan}}` | Renders hexplan section with status handling and execution instructions |
| `{{@GenericTile(...)}}` | Renders a tile with specified fields |
| `{{@Folder(...)}}` | Renders organizational tile structure |
| `{{@TileOrFolder(...)}}` | Conditionally renders as tile or folder based on itemType |
| `{{@ChildTemplateName}}` | Expands to content of structural child template tile (see below) |

### Sub-template Expansion with `{{@ChildTemplateName}}`

Template tiles can reference their structural children (directions 1-6) as sub-templates. When the pre-processor encounters `{{@SomeChildName}}`, it:

1. Looks up a structural child tile with `templateName: "SomeChildName"`
2. Retrieves that child's content
3. Recursively pre-processes the child content (supporting nested templates)
4. Inserts the expanded result in place of the tag

**Example template hierarchy:**
```
Template "my-agent-template" (parent)
├── [1] Sub-template "HeaderSection"
├── [2] Sub-template "ContextBlock"
└── [3] Sub-template "TaskSection"
```

**Parent template content:**
```mustache
{{@HeaderSection}}

{{@ContextBlock}}

{{@TaskSection}}
```

**Benefits:**
- Template structure is visible in the map
- Self-contained: copying a template tile includes all sub-templates
- Overridable: fork and modify individual sub-templates

**Error handling:**
- If a referenced child template is not found, throws `TemplateError`
- Circular template references are detected and throw `CircularTemplateError`

## Tile-Based Template Lookup

The `buildPrompt` function supports looking up templates from tile storage, enabling user-created templates and transparent prompt inspection.

### TemplateResolverService Integration

The `TemplateResolverService` (located at `~/lib/domains/agentic/services/template-resolver.service.ts`) provides the interface for retrieving templates from tile storage:

```typescript
interface TemplateRepository {
  findByTemplateName(templateName: string): Promise<TemplateData | null>
  findByTemplateNameWithChildren(templateName: string): Promise<TemplateWithChildren | null>
}

class TemplateResolverService {
  // Look up a template by its templateName field
  async getTemplateByName(templateName: string): Promise<TemplateData>

  // Look up a template with its structural children (sub-templates)
  async getTemplateWithSubTemplates(templateName: string): Promise<TemplateWithChildren>
}
```

**Key types:**
- `TemplateData`: Contains `templateName`, `title`, `content`, and `coords`
- `TemplateWithChildren`: Extends `TemplateData` with `subTemplates` array
- `TemplateNotFoundError`: Thrown when a template lookup fails

### Fallback Behavior to TypeScript Constants

When a template is not found in tile storage, `buildPrompt` falls back to the built-in TypeScript constants:

1. **SYSTEM tiles**: Falls back to `SYSTEM_TEMPLATE` from `_system-template.ts`
2. **USER tiles**: Falls back to `USER_TEMPLATE` from `_user-template.ts`
3. **Custom types**: Throws `TemplateNotFoundError` if no tile-based template exists

This ensures backward compatibility while enabling the transition to tile-based templates.

**Lookup order:**
1. Query tile storage by `itemType` (lowercased)
2. If not found, check built-in TypeScript constants
3. If still not found, throw appropriate error

### Template Tile Discovery

Templates are discovered by their `templateName` field, which maps to tile `itemType`:
- Tile with `itemType: "system"` → looks for template with `templateName: "system"`
- Tile with `itemType: "my-agent"` → looks for template with `templateName: "my-agent"`

Built-in template tiles are stored at well-known coordinates under the system user (see "Built-in Templates" section above).

## Key Principles

- **Template per ItemType**: Each `MapItemType` has its own template. SYSTEM and USER are implemented.
- **Templates as Tiles**: Built-in templates are stored in the database, not just code (transparency principle).
- **Clean Separation**: Templates know nothing about database, HTTP, or LLM concerns.
- **Fail Fast**: Unimplemented item types throw clear errors rather than falling back silently.
- **XML Output**: Prompts use XML tags for structured sections that agents can parse.
- **Minimal Public API**: Only essential functions and types are exported. All internals are hidden.
- **Fallback to Constants**: Built-in templates in TypeScript constants serve as fallback when tile-based templates are unavailable.
