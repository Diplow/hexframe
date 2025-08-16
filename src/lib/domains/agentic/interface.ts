/**
 * Public API for Agentic Domain
 * 
 * Consumers: App layer (Chat), tRPC API, EventBus handlers
 */

// Domain services
export { AgenticService } from './services/agentic.service';
export { createAgenticService as AgenticFactory } from './services/agentic.factory';
export { createAgenticService } from './services';

// Context builders
export { CanvasContextBuilder } from './services/canvas-context-builder.service';
export { ChatContextBuilder } from './services/chat-context-builder.service';
export { ContextCompositionService } from './services/context-composition.service';
export { ContextSerializerService } from './services/context-serializer.service';
export type { TokenizerService } from './services/tokenizer.service';

// Repository implementations (for service instantiation)
export { OpenRouterRepository, QueuedLLMRepository } from './repositories/interface';
export type { ILLMRepository } from './repositories/interface';

// Domain types
export type {
  LLMGenerationParams,
  LLMResponse,
  StreamChunk,
  ModelInfo,
  LLMError,
} from './types/llm.types';

export type {
  TileContextItem as ContextItem,
  CanvasContextOptions as ContextBuildOptions,
  ContextComposition as SerializedContext,
} from './types/context.types';

export type {
  GenerateResponseInput as GenerateRequest,
  GenerateResponseOutput as GenerateResponse,
  ListModelsOutput as StreamGenerateRequest,
} from './types/contracts';

export type {
  CompositionConfig,
} from './types';

export type {
  QueuedJobResponse,
  JobResult,
} from './types/job.types';

// Infrastructure (for setup)
export { inngest, inngestFunctions } from './infrastructure/interface';