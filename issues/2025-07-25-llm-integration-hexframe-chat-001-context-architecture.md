# Context Computation Architecture for LLM Integration

## Overview

This document details the isolated context computation architecture for the LLM integration in Hexframe. The architecture is designed to be easily extensible as context strategies evolve over time.

## Design Principles

1. **Isolation**: Context computation logic is completely isolated from other concerns
2. **Extensibility**: Easy to add new context strategies without modifying existing code
3. **Testability**: Each component can be tested independently
4. **Performance**: Efficient computation with caching where appropriate
5. **Type Safety**: Full TypeScript support with clear interfaces

## Architecture Components

### 1. Core Interfaces

```typescript
// /src/lib/domains/agentic/types/context.types.ts

export interface TileContext {
  center: TileContextItem;
  children: TileContextItem[];
  grandchildren: TileContextItem[];
  metadata: ContextMetadata;
}

export interface TileContextItem {
  coordId: string;
  name: string;
  description: string;
  position?: HexPosition;
  depth: number;
  hasChildren: boolean;
}

export interface ContextMetadata {
  totalTiles: number;
  maxDepth: number;
  computedAt: Date;
  strategy: ContextStrategy;
}

export type ContextStrategy = 
  | 'minimal'      // Just the center tile
  | 'standard'     // Center + 2 generations (default)
  | 'extended'     // Center + 3 generations
  | 'focused'      // Center + specific children
  | 'historical';  // Include conversation history context
```

### 2. Context Builder Service

```typescript
// /src/lib/domains/agentic/services/context-builder.service.ts

export interface ContextBuilderConfig {
  strategy: ContextStrategy;
  maxTokens?: number;
  includeEmptyTiles?: boolean;
  includeMetadata?: boolean;
}

export class ContextBuilderService {
  constructor(
    private readonly tileRepository: TileRepository,
    private readonly tokenizer: TokenizerService
  ) {}

  async buildContext(
    centerCoordId: string,
    config: ContextBuilderConfig
  ): Promise<TileContext> {
    const builder = this.getStrategyBuilder(config.strategy);
    const rawContext = await builder.build(centerCoordId, config);
    
    // Optimize context if token limit specified
    if (config.maxTokens) {
      return this.optimizeContext(rawContext, config.maxTokens);
    }
    
    return rawContext;
  }

  private getStrategyBuilder(strategy: ContextStrategy): ContextBuilder {
    return this.strategyBuilders.get(strategy) ?? this.defaultBuilder;
  }
}
```

### 3. Context Strategies

```typescript
// /src/lib/domains/agentic/services/context-strategies/base.strategy.ts

export abstract class BaseContextStrategy {
  constructor(protected readonly tileRepository: TileRepository) {}
  
  abstract build(
    centerCoordId: string,
    config: ContextBuilderConfig
  ): Promise<TileContext>;
  
  protected async getTileData(coordId: string): Promise<TileContextItem> {
    const tile = await this.tileRepository.findByCoordId(coordId);
    return this.mapToContextItem(tile);
  }
}

// /src/lib/domains/agentic/services/context-strategies/standard.strategy.ts

export class StandardContextStrategy extends BaseContextStrategy {
  async build(
    centerCoordId: string,
    config: ContextBuilderConfig
  ): Promise<TileContext> {
    const center = await this.getTileData(centerCoordId);
    const children = await this.getChildren(centerCoordId);
    const grandchildren = await this.getGrandchildren(children);
    
    return {
      center,
      children: config.includeEmptyTiles ? children : children.filter(c => c.name),
      grandchildren: config.includeEmptyTiles ? grandchildren : grandchildren.filter(g => g.name),
      metadata: {
        totalTiles: 1 + children.length + grandchildren.length,
        maxDepth: 2,
        computedAt: new Date(),
        strategy: 'standard'
      }
    };
  }
}
```

### 4. Context Serializer

```typescript
// /src/lib/domains/agentic/services/context-serializer.service.ts

export interface SerializationFormat {
  type: 'structured' | 'narrative' | 'minimal';
  includePositions?: boolean;
  includeDescriptions?: boolean;
}

export class ContextSerializerService {
  serialize(
    context: TileContext,
    format: SerializationFormat
  ): string {
    switch (format.type) {
      case 'structured':
        return this.serializeStructured(context, format);
      case 'narrative':
        return this.serializeNarrative(context, format);
      case 'minimal':
        return this.serializeMinimal(context, format);
    }
  }

  private serializeStructured(
    context: TileContext,
    format: SerializationFormat
  ): string {
    return `
## Current Context

### Center Tile: ${context.center.name}
${format.includeDescriptions ? context.center.description : ''}

### Children (${context.children.length}):
${context.children.map(child => 
  `- ${child.name}${format.includePositions ? ` (${child.position})` : ''}${
    format.includeDescriptions ? `: ${child.description}` : ''
  }`
).join('\n')}

### Grandchildren (${context.grandchildren.length}):
${context.grandchildren.map(gc => `- ${gc.name}`).join('\n')}
    `.trim();
  }
}
```

### 5. Context Cache

```typescript
// /src/lib/domains/agentic/services/context-cache.service.ts

export class ContextCacheService {
  private cache = new Map<string, CachedContext>();
  private readonly maxAge = 5 * 60 * 1000; // 5 minutes

  async get(
    centerCoordId: string,
    strategy: ContextStrategy
  ): Promise<TileContext | null> {
    const key = `${centerCoordId}:${strategy}`;
    const cached = this.cache.get(key);
    
    if (cached && !this.isStale(cached)) {
      return cached.context;
    }
    
    return null;
  }

  set(
    centerCoordId: string,
    strategy: ContextStrategy,
    context: TileContext
  ): void {
    const key = `${centerCoordId}:${strategy}`;
    this.cache.set(key, {
      context,
      timestamp: Date.now()
    });
    
    // Cleanup old entries
    this.cleanup();
  }
}
```

### 6. Integration with LLM Service

```typescript
// /src/lib/domains/agentic/services/llm-integration.service.ts

export class LLMIntegrationService {
  constructor(
    private readonly contextBuilder: ContextBuilderService,
    private readonly serializer: ContextSerializerService,
    private readonly llmClient: LLMClient
  ) {}

  async generateResponse(
    messages: ChatMessage[],
    centerCoordId: string,
    options: LLMOptions
  ): Promise<LLMResponse> {
    // Build context
    const context = await this.contextBuilder.buildContext(
      centerCoordId,
      {
        strategy: options.contextStrategy ?? 'standard',
        maxTokens: options.maxContextTokens ?? 1000,
        includeEmptyTiles: false,
        includeMetadata: true
      }
    );
    
    // Serialize context
    const serializedContext = this.serializer.serialize(
      context,
      {
        type: options.serializationFormat ?? 'structured',
        includePositions: true,
        includeDescriptions: true
      }
    );
    
    // Prepare system prompt with context
    const systemPrompt = this.buildSystemPrompt(serializedContext);
    
    // Generate response
    return this.llmClient.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      model: options.model,
      temperature: options.temperature
    });
  }
}
```

## Evolution Strategy

### Phase 1: Basic Context (MVP)
- Standard strategy only (center + 2 generations)
- Structured serialization format
- Simple caching

### Phase 2: Advanced Strategies
- Add focused strategy (specific branches)
- Add historical strategy (conversation aware)
- Narrative serialization for better LLM understanding

### Phase 3: Intelligent Context
- Token-aware context optimization
- Dynamic strategy selection based on query
- Context importance scoring

### Phase 4: Multi-modal Context
- Include tile images/visualizations
- Add spatial relationship descriptions
- Include user interaction patterns

## Testing Strategy

```typescript
// /src/lib/domains/agentic/services/__tests__/context-builder.test.ts

describe('ContextBuilderService', () => {
  it('should build standard context correctly', async () => {
    const builder = new ContextBuilderService(mockRepo, mockTokenizer);
    const context = await builder.buildContext('user:123,group:456:1,2', {
      strategy: 'standard',
      includeEmptyTiles: false
    });
    
    expect(context.center.coordId).toBe('user:123,group:456:1,2');
    expect(context.children).toHaveLength(6);
    expect(context.grandchildren).toHaveLength(36);
  });
  
  it('should respect token limits', async () => {
    const context = await builder.buildContext('user:123,group:456:1,2', {
      strategy: 'standard',
      maxTokens: 500
    });
    
    const serialized = serializer.serialize(context, { type: 'structured' });
    const tokenCount = tokenizer.count(serialized);
    expect(tokenCount).toBeLessThanOrEqual(500);
  });
});
```

## Configuration

```typescript
// /src/lib/domains/agentic/config/context.config.ts

export const contextConfig = {
  defaults: {
    strategy: 'standard' as ContextStrategy,
    maxTokens: 1000,
    serializationFormat: 'structured',
    cacheEnabled: true,
    cacheTTL: 5 * 60 * 1000 // 5 minutes
  },
  
  strategies: {
    minimal: {
      maxDepth: 0,
      includeDescriptions: false
    },
    standard: {
      maxDepth: 2,
      includeDescriptions: true
    },
    extended: {
      maxDepth: 3,
      includeDescriptions: true
    }
  },
  
  tokenLimits: {
    'gpt-3.5-turbo': 4000,
    'gpt-4': 8000,
    'claude-2': 100000,
    'claude-3-opus': 200000
  }
};
```

## Benefits of This Architecture

1. **Isolation**: Context computation is completely separate from chat, LLM, and other concerns
2. **Extensibility**: New strategies can be added without modifying existing code
3. **Testability**: Each component (builder, serializer, cache) can be tested independently
4. **Performance**: Caching and token optimization built-in
5. **Flexibility**: Multiple serialization formats for different LLM preferences
6. **Evolution-Ready**: Clear phases for adding advanced features over time

## Next Steps

1. Implement the core interfaces and base strategy
2. Create the standard context strategy
3. Add comprehensive tests
4. Integrate with the agentic service
5. Add monitoring and metrics for context usage