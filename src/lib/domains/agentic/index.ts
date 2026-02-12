/**
 * Public API for Agentic Domain
 *
 * Consumers: App layer (Chat), tRPC API, EventBus handlers
 */

import { withLogging } from '~/lib/debug/with-logging';

// Domain services
import { AgenticService as _AgenticService } from '~/lib/domains/agentic/services/agentic.service';
export const AgenticService = withLogging("AgenticService", _AgenticService);

import { createAgenticService as _createAgenticService } from '~/lib/domains/agentic/services/agentic.factory';
export { _createAgenticService as AgenticFactory };
export const createAgenticService = withLogging("createAgenticService", _createAgenticService);

import { createAgenticServiceAsync as _createAgenticServiceAsync } from '~/lib/domains/agentic/services';
export const createAgenticServiceAsync = withLogging("createAgenticServiceAsync", _createAgenticServiceAsync);

import { PreviewGeneratorService as _PreviewGeneratorService } from '~/lib/domains/agentic/services/preview-generator.service';
export const PreviewGeneratorService = withLogging("PreviewGeneratorService", _PreviewGeneratorService);
export type { GeneratePreviewInput, GeneratePreviewResult } from '~/lib/domains/agentic/services/preview-generator.service';

import { RunService as _RunService } from '~/lib/domains/agentic/services/_run-services';
export const RunService = withLogging("RunService", _RunService);
export type { Run, RunStatus, ExecutionLogEntry, ToolCallEntry } from '~/lib/domains/agentic/services/_run-services';

// Context builders
import { CanvasContextBuilder as _CanvasContextBuilder } from '~/lib/domains/agentic/services/_context/canvas-context-builder.service';
export const CanvasContextBuilder = withLogging("CanvasContextBuilder", _CanvasContextBuilder);

import { ChatContextBuilder as _ChatContextBuilder } from '~/lib/domains/agentic/services/_context/chat-context-builder.service';
export const ChatContextBuilder = withLogging("ChatContextBuilder", _ChatContextBuilder);

import { ContextCompositionService as _ContextCompositionService } from '~/lib/domains/agentic/services/_context/context-composition.service';
export const ContextCompositionService = withLogging("ContextCompositionService", _ContextCompositionService);

import { ContextSerializerService as _ContextSerializerService } from '~/lib/domains/agentic/services/_context/context-serializer.service';
export const ContextSerializerService = withLogging("ContextSerializerService", _ContextSerializerService);

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
import { executeTaskStreaming as _executeTaskStreaming } from '~/lib/domains/agentic/services/task-execution.service';
export const executeTaskStreaming = withLogging("executeTaskStreaming", _executeTaskStreaming);
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
import {
  TemplateAllowlistService as _TemplateAllowlistService,
  TemplateResolverService as _TemplateResolverService,
  PromptTemplateService as _PromptTemplateService,
} from '~/lib/domains/agentic/services/_templates';
export const TemplateAllowlistService = withLogging("TemplateAllowlistService", _TemplateAllowlistService);
export const TemplateResolverService = withLogging("TemplateResolverService", _TemplateResolverService);
export const PromptTemplateService = withLogging("PromptTemplateService", _PromptTemplateService);
export {
  TemplateNotAllowedError,
  TemplateVisibilityError,
  BUILT_IN_TEMPLATES,
  TemplateNotFoundError,
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
