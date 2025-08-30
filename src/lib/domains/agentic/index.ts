/**
 * Public API for Agentic Domain
 * 
 * Consumers: App layer (Chat), tRPC API, EventBus handlers
 */

// Domain services
export { AgenticService } from '~/lib/domains/agentic/services/agentic.service';
export { createAgenticService as AgenticFactory } from '~/lib/domains/agentic/services/agentic.factory';
export { createAgenticService } from '~/lib/domains/agentic/services';

// Context builders
export { CanvasContextBuilder } from '~/lib/domains/agentic/services/canvas-context-builder.service';
export { ChatContextBuilder } from '~/lib/domains/agentic/services/chat-context-builder.service';
export { ContextCompositionService } from '~/lib/domains/agentic/services/context-composition.service';
export { ContextSerializerService } from '~/lib/domains/agentic/services/context-serializer.service';
export type { TokenizerService } from '~/lib/domains/agentic/services/tokenizer.service';

// Repository implementations (for service instantiation)
export { OpenRouterRepository, QueuedLLMRepository } from '~/lib/domains/agentic/repositories';
export type { ILLMRepository } from '~/lib/domains/agentic/repositories';

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
export { inngest, inngestFunctions } from '~/lib/domains/agentic/infrastructure';