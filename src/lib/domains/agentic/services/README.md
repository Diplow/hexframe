# Agentic Services

## Mental Model
Like a translation bureau that takes hexagonal map context and chat history, converts them into AI-friendly formats, and orchestrates conversations with language models. The factory can optionally reserve a "meeting room" (sandbox) that persists across multiple conversations using the session manager.

## Responsibilities
- Orchestrate AI conversations by combining map context with chat history
- Build and compose context from canvas (hexagonal tiles) and chat messages
- Manage prompt templates and AI model interactions (both streaming and non-streaming)
- Support tool usage in AI conversations for extended functionality
- Create and manage subagents with specific configurations and capabilities
- Handle tokenization and optimize context size to fit model limits
- Serialize complex domain data into AI-readable formats
- Select and configure LLM repositories (OpenRouter, Claude Agent SDK, or Sandbox)
- Integrate with sandbox session manager for persistent sandbox reuse via `createAgenticServiceAsync`
- Resolve template tiles by name for {{@TemplateName}} expansion in prompts
- Validate user template allowlists before executing templates

## Subsystems
- `_context/` - Context building and composition services (tokenization, serialization, canvas/chat context builders)
- `_templates/` - Template services for resolution, rendering, and allowlist validation
- `canvas-strategies/` - Strategies for selecting which canvas tiles to include
- `chat-strategies/` - Strategies for selecting which chat messages to include
- `serializers/` - Format converters (XML, narrative, minimal, structured)
- `sandbox-session/` - Sandbox session lifecycle management

## Key Services
- `agentic.service.ts` - Main orchestrator for AI conversations
- `agentic.factory.ts` - Factory for creating AgenticService instances with optional sandbox
- `preview-generator.service.ts` - Generates previews for tiles
- `task-execution.service.ts` - Executes tasks within the agentic framework

## Template Services (`_templates/`)

The `_templates/` subfolder contains services for template management:

### TemplateAllowlistService

Validates that users can only execute templates they have explicitly allowed. Implements the User Template Allowlist Enforcement feature.

**Purpose**: Security layer that prevents unauthorized template execution.

**Methods**:
- `validateAllowlist(userId, templateName)` - Throws `TemplateNotAllowedError` if template is not allowed
- `isBuiltInTemplate(templateName)` - Checks if a template is built-in (always allowed)
- `getUserAllowlist(userId)` - Gets user's custom allowlist
- `getEffectiveAllowlist(userId)` - Gets combined built-in + custom templates
- `validateVisibility(templateName, tileVisibility, templateVisibility)` - Enforces visibility constraints

**Built-in Templates** (`BUILT_IN_TEMPLATES` constant):
- `system`, `user`, `organizational`, `context` - Always allowed for all users

**Default Behavior**:
- Anonymous users: Only built-in templates allowed
- New users (no allowlist): Only built-in templates allowed
- Users with allowlist: Built-in templates + custom allowed templates

### TemplateResolverService

Resolves template tiles by name from the database. Used by `buildPrompt()` to retrieve template content for `{{@TemplateName}}` expansion.

**Methods**:
- `getTemplateByName(templateName)` - Gets template data by name
- `getTemplateWithSubTemplates(templateName)` - Gets template with its structural children

### PromptTemplateService

Renders prompt templates from the `prompts.constants` registry.

**Methods**:
- `renderTemplate(templateName, variables)` - Renders a template with variable substitution

### Error Classes

| Error | When Thrown |
|-------|-------------|
| `TemplateNotAllowedError` | User attempts to use a template not in their allowlist |
| `TemplateVisibilityError` | Public tile attempts to use a private template |
| `TemplateNotFoundError` | Template does not exist in the database |

### Integration with Hexecute

When `hexecute` resolves a template reference (`{{@TemplateName}}`):
1. `TemplateAllowlistService.validateAllowlist()` checks user permission
2. `TemplateResolverService.getTemplateByName()` fetches the template content
3. Template content is substituted into the prompt

## Non-Responsibilities
- Unit tests -> See `./__tests__/`
- Direct AI model communication -> See `~/lib/domains/agentic/repositories`
- Intent classification logic -> See `~/lib/domains/agentic/intent-classification`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.