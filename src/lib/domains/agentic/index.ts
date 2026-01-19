/**
 * Public API for Agentic Domain
 * 
 * Consumers: App layer (Chat), tRPC API, EventBus handlers
 */

// Domain services
export { AgenticService } from '~/lib/domains/agentic/services/agentic.service';
export { createAgenticService as AgenticFactory } from '~/lib/domains/agentic/services/agentic.factory';
export { createAgenticService, createAgenticServiceAsync } from '~/lib/domains/agentic/services';
export { PreviewGeneratorService } from '~/lib/domains/agentic/services/preview-generator.service';
export type { GeneratePreviewInput, GeneratePreviewResult } from '~/lib/domains/agentic/services/preview-generator.service';

// Context builders
export { CanvasContextBuilder } from '~/lib/domains/agentic/services/_context/canvas-context-builder.service';
export { ChatContextBuilder } from '~/lib/domains/agentic/services/_context/chat-context-builder.service';
export { ContextCompositionService } from '~/lib/domains/agentic/services/_context/context-composition.service';
export { ContextSerializerService } from '~/lib/domains/agentic/services/_context/context-serializer.service';
export type { TokenizerService } from '~/lib/domains/agentic/services/_context/tokenizer.service';

// Repository implementations (for service instantiation)
export { OpenRouterRepository, ClaudeAgentSDKRepository, QueuedLLMRepository } from '~/lib/domains/agentic/repositories';
export type { ILLMRepository } from '~/lib/domains/agentic/repositories';

// Domain types
export type {
  LLMGenerationParams,
  LLMResponse,
  StreamChunk,
  ModelInfo,
  LLMError,
} from '~/lib/domains/agentic/types/llm.types';

export type {
  TileContextItem as ContextItem,
  CanvasContextOptions as ContextBuildOptions,
  ContextComposition as SerializedContext,
} from '~/lib/domains/agentic/types/context.types';

export type {
  GenerateResponseInput as GenerateRequest,
  GenerateResponseOutput as GenerateResponse,
  ListModelsOutput as StreamGenerateRequest,
  ChatMessageContract,
  AIContextSnapshot,
} from '~/lib/domains/agentic/types/contracts';

export type {
  CompositionConfig,
} from '~/lib/domains/agentic/types';

export type {
  QueuedJobResponse,
  JobResult,
} from '~/lib/domains/agentic/types/job.types';

// Streaming types
export type {
  StreamEvent,
  TextDeltaEvent,
  PromptGeneratedEvent,
  ToolCallStartEvent,
  ToolCallDeltaEvent,
  ToolCallEndEvent,
  TileMutationEvent,
  StreamErrorEvent,
  StreamDoneEvent,
  StreamEventType,
  StreamErrorCode,
  TileCoordinates,
} from '~/lib/domains/agentic/types/stream.types';

export {
  isTextDeltaEvent,
  isPromptGeneratedEvent,
  isToolCallEvent,
  isTileMutationEvent,
  isStreamTerminalEvent,
} from '~/lib/domains/agentic/types/stream.types';

// Infrastructure (for setup)
export { inngest, inngestFunctions } from '~/lib/domains/agentic/infrastructure';

// Sandbox Session Manager
export { sandboxSessionManager, SandboxSessionManager } from '~/lib/domains/agentic/services/sandbox-session';
export type { SandboxSession, SandboxSessionManagerConfig, ISandboxSessionManager } from '~/lib/domains/agentic/services/sandbox-session';

// Task execution (pure agentic streaming)
export { executeTaskStreaming } from '~/lib/domains/agentic/services/task-execution.service';
export type {
  TaskExecutionInput,
  TaskExecutionCallbacks,
  TaskTile,
  ComposedChildTile,
  StructuralChildTile,
  AncestorTile,
  LeafTask,
} from '~/lib/domains/agentic/services/task-execution.service';

// Note: For hexplan generation utilities (generateParentHexplanContent, generateLeafHexplanContent),
// import directly from '~/lib/domains/agentic/utils' - the domain index should not reexport utils.

// Template services
export {
  TemplateAllowlistService,
  TemplateNotAllowedError,
  TemplateVisibilityError,
  BUILT_IN_TEMPLATES,
  TemplateResolverService,
  TemplateNotFoundError,
  PromptTemplateService,
} from '~/lib/domains/agentic/services/_templates';
export type {
  Visibility as TemplateVisibility,
  UserAllowlist,
  TemplateAllowlistRepository,
  TemplateData,
  TemplateWithChildren,
  TemplateRepository,
} from '~/lib/domains/agentic/services/_templates';

// Infrastructure repositories
export { DrizzleTemplateAllowlistRepository } from '~/lib/domains/agentic/infrastructure/template-allowlist';