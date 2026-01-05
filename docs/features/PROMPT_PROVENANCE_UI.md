# Prompt Provenance UI

## Summary

Show users exactly which tiles and templates contributed to each part of a generated prompt, enabling transparency and debuggability.

## Motivation

**Current state:** The Chat can display the generated prompt, but it's an opaque text blob. Users cannot see:
- Which tile contributed which section
- Which template rendered it
- How to modify a specific part of the output

**Problem:**
- Debugging prompts requires mental reconstruction
- Users can't learn how their tile structure affects prompts
- No easy path from "I don't like this part" to "here's where to change it"

**Hexframe principle:** Transparency. Users should understand exactly how their system produces outputs.

## Relationship to Templates as Tiles

This feature builds on [Templates as Tiles](./TEMPLATES_AS_TILES.md):

| Templates as Tiles provides | This feature uses it for |
|----------------------------|--------------------------|
| Templates have coordinates | Link prompt sections to template source |
| Sub-templates are children | Show template composition hierarchy |
| Dynamic tile types | Show which type produced each section |

## Core Design

### 1. Annotated Prompt Structure

The prompt builder returns both:
- **Raw prompt**: The text sent to the LLM (unchanged)
- **Annotated prompt**: Structured representation with provenance

```typescript
interface AnnotatedPrompt {
  raw: string;
  sections: PromptSection[];
}

interface PromptSection {
  content: string;
  source: {
    tileCoords: string;        // e.g., "userId,0:1,3"
    tileTitle: string;
    templateCoords?: string;   // Template that rendered this tile
    templateName?: string;
  };
  children?: PromptSection[];  // Nested sections (sub-templates)
}
```

### 2. Section Boundaries

Each discrete prompt section tracks its origin:

```
┌─────────────────────────────────────────────────────────────┐
│ <hexrun-intro>                                              │
│ This prompt was generated from Hexframe tiles...            │
│                                                             │
│ Source: Template "system" → HexrunIntro section             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ <context title="API Reference" coords="user,0:1,-2">        │
│ The API uses REST conventions...                            │
│ </context>                                                  │
│                                                             │
│ Source: Tile "API Reference" at user,0:1,-2                 │
│         Rendered by: GenericTile primitive                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ <task>                                                      │
│ <goal>Implement authentication</goal>                       │
│ Add JWT-based auth to the API endpoints...                  │
│ </task>                                                     │
│                                                             │
│ Source: Tile "Implement authentication" at user,0:1,3       │
│         Rendered by: Template "system" → TaskSection        │
└─────────────────────────────────────────────────────────────┘
```

### 3. UI Presentation Options

#### Option A: Highlighted Blocks

Prompt displayed as text with colored/bordered blocks. Hovering shows source info.

```
┌─ Template: system ──────────────────────────────────────────┐
│ <hexrun-intro>                                              │
│ This prompt was generated from Hexframe tiles...            │
│ </hexrun-intro>                                             │
└─────────────────────────────────────────────────────────────┘

┌─ Tile: API Reference (user,0:1,-2) ─────────────────────────┐
│ <context title="API Reference">                             │
│ The API uses REST conventions...                            │
│ </context>                                                  │
└─────────────────────────────────────────────────────────────┘
```

**Interactions:**
- Hover: Show source tile/template info
- Click: Navigate to source tile in map
- Right-click: "Edit this tile" / "View template"

#### Option B: Side Panel

Prompt text on left, source tree on right. Selecting text highlights corresponding source.

```
┌────────────────────────────┬─────────────────────────────┐
│ <hexrun-intro>             │ ▼ Prompt Structure          │
│ This prompt was generated  │   ├─ HexrunIntro (template) │
│ from Hexframe tiles...     │   ├─ Context                │
│ </hexrun-intro>            │   │  └─ API Reference       │
│                            │   ├─ Subtasks               │
│ <context title="API Ref">  │   │  ├─ Task 1              │
│ The API uses REST...       │   │  └─ Task 2              │
│ </context>                 │   ├─ Task                   │
│                            │   │  └─ Implement auth      │
│ <subtasks>                 │   └─ HexPlan (template)     │
│ ...                        │                             │
└────────────────────────────┴─────────────────────────────┘
```

#### Option C: Inline Annotations (Collapsible)

Each section has a small annotation bar that expands on click.

```
▸ Template: system/hexrun-intro ─────────────────────────────
<hexrun-intro>
This prompt was generated from Hexframe tiles...
</hexrun-intro>

▸ Tile: API Reference ───────────────────────────────────────
<context title="API Reference">
The API uses REST conventions...
</context>
```

### 4. Implementation Approach

#### Phase 1: Track Provenance in Prompt Builder

Modify `buildPrompt()` to return `AnnotatedPrompt`:

```typescript
// Before
function buildPrompt(data: PromptData): string

// After
function buildPrompt(data: PromptData): AnnotatedPrompt
// or
function buildAnnotatedPrompt(data: PromptData): AnnotatedPrompt
```

Each section builder tracks its source:

```typescript
function _buildContextSection(composedChildren, ...): PromptSection[] {
  return composedChildren.map(child => ({
    content: GenericTile(child, ['title', 'content'], 'context'),
    source: {
      tileCoords: child.coords,
      tileTitle: child.title,
      // templateCoords if rendered by a tile-based template
    }
  }));
}
```

#### Phase 2: Store Provenance with Chat Messages

The annotated prompt is stored alongside messages:

```typescript
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  promptProvenance?: AnnotatedPrompt;  // For system messages
}
```

#### Phase 3: Render in Chat UI

Add prompt viewer component with provenance display:

```typescript
<PromptViewer
  prompt={message.promptProvenance}
  onTileClick={(coords) => navigateToTile(coords)}
  onTemplateClick={(coords) => navigateToTemplate(coords)}
/>
```

## Data Flow

```
Tile Hierarchy
     │
     ▼
┌─────────────────┐
│ buildPrompt()   │──────────────────────────────────────────┐
│                 │                                          │
│ For each section:                                          │
│   - Render content                                         │
│   - Track source tile coords                               │
│   - Track template coords (if applicable)                  │
└─────────────────┘                                          │
     │                                                       │
     ▼                                                       ▼
┌─────────────────┐                              ┌───────────────────┐
│ Raw Prompt      │                              │ Annotated Prompt  │
│ (sent to LLM)   │                              │ (for UI display)  │
└─────────────────┘                              └───────────────────┘
                                                          │
                                                          ▼
                                                 ┌───────────────────┐
                                                 │ Chat UI           │
                                                 │ Prompt Viewer     │
                                                 └───────────────────┘
```

## Rendering Primitive Provenance

For code-based primitives (`GenericTile`, `Folder`, etc.), track which primitive rendered the content:

```typescript
interface PromptSection {
  source: {
    tileCoords: string;
    tileTitle: string;
    templateCoords?: string;   // If tile-based template
    templateName?: string;
    primitive?: string;        // "GenericTile", "Folder", etc.
  };
}
```

This enables:
- "This was rendered by the GenericTile primitive with fields: title, content"
- Future: link to primitive documentation

## Interactive Features

### 1. Click to Navigate
Click any section → navigate to source tile in the map view.

### 2. Edit in Place
"Edit this tile" button → opens tile editor, changes reflect in next prompt.

### 3. Template Inspection
"View template" → shows the template tile that rendered this section.

### 4. Diff View (Future)
Compare two prompt versions to see what changed after tile edits.

## Migration Considerations

### Backward Compatibility
- Existing `buildPrompt()` API continues to work (returns raw string)
- New `buildAnnotatedPrompt()` for provenance-aware callers
- Or: `buildPrompt()` returns `AnnotatedPrompt`, with `.raw` for the string

### Chat History
- Existing messages don't have provenance data
- New messages store provenance
- UI gracefully handles missing provenance (shows raw text only)

## Open Questions

1. **Granularity:** How fine-grained should sections be? Per-tile? Per XML tag? Per line?

2. **Performance:** Does tracking provenance add significant overhead? Benchmark needed.

3. **Storage:** Store full annotated prompt, or reconstruct from tile versions on demand?

4. **Nesting display:** How to show deeply nested template composition without overwhelming the UI?

## Non-Goals (For This Feature)

- Real-time prompt preview as you edit tiles (separate feature)
- Prompt diffing between versions
- Template debugging/stepping
- Prompt optimization suggestions
