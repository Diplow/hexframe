# Templates as Tiles

## Summary

Store prompt templates as tiles rather than TypeScript code, enabling user-created templates and transparent prompt inspection.

## Motivation

**Current state:** Templates are hardcoded in TypeScript (`SYSTEM_TEMPLATE`, `USER_TEMPLATE`, etc.). Users cannot customize how their tiles are rendered into prompts.

**Problem:**
- No transparency into prompt generation
- Users cannot create custom tile types with custom rendering
- Templates are invisible code artifacts, not first-class data

**Hexframe principle:** Transparency. Prompts should always be inspectable. If a user shares a tile, others should understand how it renders.

## Core Design Decisions

### 1. Dynamic Tile Types

**Change:** Replace `MapItemType` enum with a string field.

```typescript
// Before
enum MapItemType { USER, ORGANIZATIONAL, CONTEXT, SYSTEM }

// After
itemType: string  // "user", "organizational", "context", "system", "my-custom-type"
```

**Constraints:**
- Built-in types (`user`, `organizational`, `context`, `system`) are reserved
- Unique constraint on `itemType` (for now)
- Future: `(userId, itemType)` unique constraint to allow per-user type names

### 2. Templates as Tiles

A template is a tile of type `template` containing Mustache markup in its content field.

**Template tile structure:**
- `itemType`: `"template"`
- `title`: Human-readable name (e.g., "System Task Template")
- `content`: Mustache template markup
- `templateName`: Identifier used in lookups (e.g., "system", "my-agent")

**Example template content:**
```mustache
{{{hexrunIntro}}}
{{#hasComposedChildren}}

{{{contextSection}}}
{{/hasComposedChildren}}

<task>
<goal>{{{task.title}}}</goal>
{{#task.hasContent}}
{{{task.content}}}
{{/task.hasContent}}
</task>

{{@HexPlan}}
```

### 3. Sub-templates as Structural Children

Template composition follows tile hierarchy. A template's reusable components are its structural children (directions 1-6).

```
Template "my-agent-template"
├── [1] Sub-template "HeaderSection"
├── [2] Sub-template "ContextBlock"
└── [3] Sub-template "TaskSection"
```

**Pre-processor lookup:**
- `{{@HeaderSection}}` → finds child tile with `templateName: "HeaderSection"`
- Renders that child template with current context
- Inserts result into parent

**Benefits:**
- Template structure visible in the map
- Self-contained: copy template tile → get all sub-templates
- Overridable: fork and modify individual sub-templates

### 4. Rendering Primitives Stay as Code

Functions like `GenericTile`, `Folder`, `HexPlan` remain TypeScript:

```typescript
// Still available to all templates
GenericTile(tile, ['title', 'content'], 'context')
Folder(tile, ['title', 'preview'], 3)
```

**Rationale:** These encode escaping logic, recursion, and field selection. Keeping them as code:
- Maintains security (XML escaping is critical)
- Avoids complex declarative DSL design
- Gives users powerful primitives without reimplementation

**Future consideration:** Declarative rendering primitives as tiles (post-MVP).

### 5. Template-Type Binding

Each custom tile type maps to exactly one template:
- Type `"system"` → renders with template `templateName: "system"`
- Type `"my-agent"` → renders with template `templateName: "my-agent"`

**Creating a new template effectively creates a new tile type.**

### 6. User Allowlist for Templates

Users maintain an allowlist of templates they can execute:

```typescript
interface UserTemplateConfig {
  allowedTemplates: string[]  // e.g., ["system", "user", "my-agent"]
}
```

**Behavior:**
- `hexecute` checks if tile's type has an allowed template
- Unknown/disallowed template → error, execution stops
- Prevents arbitrary template execution

### 7. Transparency Principle

**Rule:** If a template is private, tiles using that template type must also be private.

**Rationale:** A shared tile's prompt should be reconstructable. If someone can see a tile but not its template, they cannot understand how it will execute.

**Implementation:**
- When sharing a tile publicly, validate its template is also public
- When making a template private, warn about affected public tiles

## Data Model Changes

### Template Name Column

```sql
ALTER TABLE map_items ADD COLUMN template_name VARCHAR(100) NULL;
ALTER TABLE map_items ADD CONSTRAINT unique_template_name UNIQUE (template_name);
```

**Decision:** Nullable column. Simple, DB-validated, sufficient for this use case.

## Migration Path

### Phase 1: Add Infrastructure
1. Change `itemType` from enum to string
2. Add `templateName` field (or metadata column)
3. Add user template allowlist storage

### Phase 2: Migrate Built-in Templates
1. Create template tiles for `SYSTEM_TEMPLATE`, `USER_TEMPLATE`
2. Store at well-known coordinates (TBD)
3. Update `buildPrompt()` to read from tiles instead of code

### Phase 3: Enable Custom Templates
1. UI for creating template tiles
2. UI for managing template allowlist
3. Template validation (syntax checking)

## Pre-processor Availability

Users have access to the same pre-processor tags:

| Tag | Behavior |
|-----|----------|
| `{{@HexPlan}}` | Expands hexplan section with status handling |
| `{{@ChildTemplateName}}` | Renders structural child template |
| `{{{variable}}}` | Mustache triple-brace (unescaped) |
| `{{#condition}}...{{/condition}}` | Mustache conditional |

## Default Behavior for Template Tiles

When `hexecute` encounters a `template` type tile:
- If user has explicitly allowed it: render using its own template (meta!)
- If not allowed (default): error

**Default template for template tiles** (if allowed): Render as context tile, showing the template content as reference material.

## Example: User Creates Custom Agent Template

```
1. User creates tile:
   - type: "template"
   - title: "Research Agent"
   - templateName: "research-agent"
   - content: (Mustache markup)

2. User creates sub-template children:
   - [1] "SourcesSection"
   - [2] "FindingsSection"

3. User adds "research-agent" to their allowlist

4. User creates tiles of type "research-agent"

5. hexecute on those tiles:
   - Finds template by templateName
   - Pre-processes {{@SourcesSection}}, {{@FindingsSection}}
   - Renders Mustache with tile data
   - Returns prompt
```

## Relationship to Second Feature (Prompt Rendering UI)

This feature enables the second planned feature: showing users which prompt parts come from which tiles/templates.

With templates as tiles:
- Each prompt section has a source coordinate
- UI can highlight "this came from template at [coords]"
- Users can click through to inspect/edit templates

## Design Decisions (Resolved)

1. **Template storage location:** System templates stored at `D1i4gEqbi01JWS2F6I7GUN8ekRiU2mjK,0:1,2` (organizational tile "Templates"). Template tiles are structural children of this tile.

2. **Template versioning:** Leverages existing tile versioning. Templates are tiles, tiles have versions.

3. **Template inheritance:** No inheritance. Extension only via sub-templates (compose, don't inherit).

## Open Questions

1. **Validation:** How do we validate template syntax before save? Show preview of rendered output?

## Non-Goals (For This Feature)

- Template marketplace/sharing between users
- Visual template editor (WYSIWYG)
- Template versioning/history
- Declarative rendering primitives as tiles (future extension)
