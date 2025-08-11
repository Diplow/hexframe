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

// Base context interface that all strategies must implement
export interface Context {
  type: string;
  metadata: ContextMetadata;
  serialize(format: SerializationFormat): string;
}

export interface ContextMetadata {
  computedAt: Date;
  tokenEstimate?: number;
}

// Canvas-specific context (tile hierarchy)
export interface CanvasContext extends Context {
  type: 'canvas';
  center: TileContextItem;
  children: TileContextItem[];
  grandchildren: TileContextItem[];
  strategy: CanvasContextStrategy;
}

export interface TileContextItem {
  coordId: string;
  name: string;
  description: string;
  position?: HexPosition;
  depth: number;
  hasChildren: boolean;
}

export type CanvasContextStrategy = 
  | 'minimal'      // Just the center tile
  | 'standard'     // Center + 2 generations (default)
  | 'extended'     // Center + 3 generations
  | 'focused'      // Center + specific children
  | 'custom';      // Custom depth/filter configuration

// Chat-specific context (conversation history)
export interface ChatContext extends Context {
  type: 'chat';
  messages: ChatContextMessage[];
  strategy: ChatContextStrategy;
}

export interface ChatContextMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    tileId?: string;
    model?: string;
  };
}

export type ChatContextStrategy = 
  | 'full'         // Entire conversation history
  | 'recent'       // Last N messages
  | 'relevant'     // Only messages mentioning current tiles
  | 'summary';     // Summarized older messages + recent full

// Composed context that combines multiple contexts
export interface ComposedContext extends Context {
  type: 'composed';
  contexts: Context[];
  composition: ContextComposition;
}

export interface ContextComposition {
  strategy: 'sequential' | 'interleaved' | 'prioritized';
  tokenAllocation?: Record<string, number>; // How many tokens per context type
}
```

### 2. Context Composition Service

```typescript
// /src/lib/domains/agentic/services/context-composition.service.ts

export interface CompositionConfig {
  canvas?: {
    enabled: boolean;
    strategy: CanvasContextStrategy;
    options?: CanvasContextOptions;
  };
  chat?: {
    enabled: boolean;
    strategy: ChatContextStrategy;
    options?: ChatContextOptions;
  };
  composition?: {
    strategy: 'sequential' | 'interleaved' | 'prioritized';
    maxTotalTokens?: number;
    tokenAllocation?: {
      canvas?: number;  // Max tokens for canvas context
      chat?: number;    // Max tokens for chat context
    };
  };
}

export class ContextCompositionService {
  constructor(
    private readonly canvasBuilder: CanvasContextBuilder,
    private readonly chatBuilder: ChatContextBuilder,
    private readonly tokenizer: TokenizerService
  ) {}

  async composeContext(
    centerCoordId: string,
    messages: ChatMessage[],
    config: CompositionConfig
  ): Promise<ComposedContext> {
    const contexts: Context[] = [];
    
    // Build canvas context if enabled
    if (config.canvas?.enabled) {
      const canvasContext = await this.canvasBuilder.build(
        centerCoordId,
        config.canvas.strategy,
        config.canvas.options
      );
      contexts.push(canvasContext);
    }
    
    // Build chat context if enabled
    if (config.chat?.enabled) {
      const chatContext = await this.chatBuilder.build(
        messages,
        config.chat.strategy,
        config.chat.options
      );
      contexts.push(chatContext);
    }
    
    // Optimize token allocation if limits specified
    if (config.composition?.maxTotalTokens) {
      return this.optimizeComposition(contexts, config.composition);
    }
    
    return {
      type: 'composed',
      contexts,
      composition: {
        strategy: config.composition?.strategy ?? 'sequential'
      },
      metadata: {
        computedAt: new Date()
      }
    };
  }

  private async optimizeComposition(
    contexts: Context[],
    compositionConfig: ContextComposition
  ): Promise<ComposedContext> {
    // Token-aware optimization logic
    // Prioritize based on strategy and allocation
  }
}
```

### 3. Canvas Context Builder

```typescript
// /src/lib/domains/agentic/services/canvas-context-builder.service.ts

export interface CanvasContextOptions {
  includeEmptyTiles?: boolean;
  includeDescriptions?: boolean;
  maxDepth?: number;
  focusedPositions?: HexPosition[]; // For 'focused' strategy
}

export class CanvasContextBuilder {
  constructor(
    private readonly tileRepository: TileRepository,
    private readonly strategies: Map<CanvasContextStrategy, ICanvasStrategy>
  ) {}

  async build(
    centerCoordId: string,
    strategy: CanvasContextStrategy,
    options?: CanvasContextOptions
  ): Promise<CanvasContext> {
    const strategyImpl = this.strategies.get(strategy) ?? this.strategies.get('standard')!;
    return strategyImpl.build(centerCoordId, options ?? {});
  }
}

// /src/lib/domains/agentic/services/canvas-strategies/standard.strategy.ts

export class StandardCanvasStrategy implements ICanvasStrategy {
  constructor(private readonly tileRepository: TileRepository) {}
  
  async build(
    centerCoordId: string,
    options: CanvasContextOptions
  ): Promise<CanvasContext> {
    const center = await this.getTileData(centerCoordId);
    const children = await this.getChildren(centerCoordId);
    const grandchildren = await this.getGrandchildren(children);
    
    return {
      type: 'canvas',
      center,
      children: this.filterTiles(children, options),
      grandchildren: this.filterTiles(grandchildren, options),
      strategy: 'standard',
      metadata: {
        computedAt: new Date()
      },
      serialize: (format: SerializationFormat) => this.serialize(format)
    };
  }
  
  private filterTiles(tiles: TileContextItem[], options: CanvasContextOptions) {
    if (!options.includeEmptyTiles) {
      return tiles.filter(t => t.name && t.name.trim());
    }
    return tiles;
  }
}

### 4. Chat Context Builder

```typescript
// /src/lib/domains/agentic/services/chat-context-builder.service.ts

export interface ChatContextOptions {
  maxMessages?: number;        // For 'recent' strategy
  relevantTileIds?: string[]; // For 'relevant' strategy
  summaryThreshold?: number;  // Messages older than N to summarize
}

export class ChatContextBuilder {
  constructor(
    private readonly strategies: Map<ChatContextStrategy, IChatStrategy>
  ) {}

  async build(
    messages: ChatMessage[],
    strategy: ChatContextStrategy,
    options?: ChatContextOptions
  ): Promise<ChatContext> {
    const strategyImpl = this.strategies.get(strategy) ?? this.strategies.get('full')!;
    return strategyImpl.build(messages, options ?? {});
  }
}

// /src/lib/domains/agentic/services/chat-strategies/full.strategy.ts

export class FullChatStrategy implements IChatStrategy {
  async build(
    messages: ChatMessage[],
    options: ChatContextOptions
  ): Promise<ChatContext> {
    const contextMessages = messages.map(msg => ({
      role: msg.type as 'user' | 'assistant' | 'system',
      content: this.extractTextContent(msg.content),
      timestamp: msg.metadata?.timestamp ?? new Date(),
      metadata: {
        tileId: msg.metadata?.tileId
      }
    }));
    
    return {
      type: 'chat',
      messages: contextMessages,
      strategy: 'full',
      metadata: {
        computedAt: new Date()
      },
      serialize: (format: SerializationFormat) => this.serialize(format)
    };
  }
  
  private extractTextContent(content: string | ChatWidget): string {
    if (typeof content === 'string') return content;
    // Handle widget content extraction
    return `[${content.type} widget]`;
  }
}
```

### 5. Context Serializer

```typescript
// /src/lib/domains/agentic/services/context-serializer.service.ts

export interface SerializationFormat {
  type: 'structured' | 'narrative' | 'minimal' | 'xml';
  includeMetadata?: boolean;
}

export class ContextSerializerService {
  serialize(context: ComposedContext, format: SerializationFormat): string {
    switch (format.type) {
      case 'structured':
        return this.serializeStructured(context);
      case 'narrative':
        return this.serializeNarrative(context);
      case 'minimal':
        return this.serializeMinimal(context);
      case 'xml':
        return this.serializeXML(context);
    }
  }

  private serializeStructured(context: ComposedContext): string {
    const parts: string[] = [];
    
    for (const ctx of context.contexts) {
      if (ctx.type === 'canvas') {
        parts.push(this.serializeCanvasContext(ctx as CanvasContext));
      } else if (ctx.type === 'chat') {
        parts.push(this.serializeChatContext(ctx as ChatContext));
      }
    }
    
    return parts.join('\n\n---\n\n');
  }

  private serializeCanvasContext(context: CanvasContext): string {
    return `
## Tile Hierarchy Context

### Current Center: ${context.center.name}
${context.center.description}

### Direct Children (${context.children.length}):
${context.children.map(child => 
  `- ${child.position ? `[${child.position}]` : ''} ${child.name}: ${child.description || 'No description'}`
).join('\n')}

### Grandchildren (${context.grandchildren.length} total):
${context.grandchildren.slice(0, 10).map(gc => `- ${gc.name}`).join('\n')}
${context.grandchildren.length > 10 ? `... and ${context.grandchildren.length - 10} more` : ''}
    `.trim();
  }

  private serializeChatContext(context: ChatContext): string {
    return `
## Conversation History

${context.messages.map(msg => 
  `### ${msg.role.charAt(0).toUpperCase() + msg.role.slice(1)}
${msg.content}
`).join('\n')}
    `.trim();
  }

  private serializeXML(context: ComposedContext): string {
    // XML format can be better for some LLMs
    return `
<context>
  ${context.contexts.map(ctx => {
    if (ctx.type === 'canvas') {
      const canvas = ctx as CanvasContext;
      return `
  <canvas_context>
    <center>
      <name>${canvas.center.name}</name>
      <description>${canvas.center.description}</description>
    </center>
    <children count="${canvas.children.length}">
      ${canvas.children.map(child => `
      <child position="${child.position || 'unpositioned'}">
        <name>${child.name}</name>
        <description>${child.description}</description>
      </child>`).join('')}
    </children>
  </canvas_context>`;
    } else if (ctx.type === 'chat') {
      const chat = ctx as ChatContext;
      return `
  <chat_context>
    ${chat.messages.map(msg => `
    <message role="${msg.role}">
      <content>${msg.content}</content>
    </message>`).join('')}
  </chat_context>`;
    }
  }).join('\n')}
</context>
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

export interface LLMGenerationOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  // Context configuration
  contextConfig?: {
    canvas?: {
      strategy: CanvasContextStrategy;
      includeEmptyTiles?: boolean;
    };
    chat?: {
      strategy: ChatContextStrategy;
      maxMessages?: number;
    };
    serialization?: SerializationFormat;
    maxContextTokens?: number;
  };
}

export class LLMIntegrationService {
  constructor(
    private readonly contextComposer: ContextCompositionService,
    private readonly serializer: ContextSerializerService,
    private readonly llmClient: LLMClient
  ) {}

  async generateResponse(
    messages: ChatMessage[],
    centerCoordId: string,
    options: LLMGenerationOptions
  ): Promise<LLMResponse> {
    // Build composed context with default configuration for v1
    const composedContext = await this.contextComposer.composeContext(
      centerCoordId,
      messages,
      {
        canvas: {
          enabled: true,
          strategy: options.contextConfig?.canvas?.strategy ?? 'standard',
          options: {
            includeEmptyTiles: options.contextConfig?.canvas?.includeEmptyTiles ?? false,
            includeDescriptions: true
          }
        },
        chat: {
          enabled: true,
          strategy: options.contextConfig?.chat?.strategy ?? 'full',
          options: {
            maxMessages: options.contextConfig?.chat?.maxMessages
          }
        },
        composition: {
          strategy: 'sequential',
          maxTotalTokens: options.contextConfig?.maxContextTokens ?? 2000,
          tokenAllocation: {
            canvas: 800,  // ~40% for tile context
            chat: 1200    // ~60% for conversation history
          }
        }
      }
    );
    
    // Serialize composed context
    const serializedContext = this.serializer.serialize(
      composedContext,
      options.contextConfig?.serialization ?? { type: 'structured' }
    );
    
    // Prepare system prompt with context
    const systemPrompt = this.buildSystemPrompt(serializedContext);
    
    // Generate response
    return this.llmClient.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        ...this.convertMessages(messages)
      ],
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens
    });
  }

  private buildSystemPrompt(serializedContext: string): string {
    return `You are an AI assistant helping with Hexframe, a visual framework for building AI-powered systems through hierarchical hexagonal maps.

${serializedContext}

Please provide helpful responses based on the current tile hierarchy and conversation history.`;
  }
}
```

## Evolution Strategy

### Phase 1: Basic Composition (MVP)
- Canvas: Standard strategy (center + 2 generations)
- Chat: Full history strategy
- Sequential composition
- Structured serialization format

### Phase 2: Advanced Strategies
- Canvas: Add focused strategy (specific branches), minimal, extended
- Chat: Add recent (last N), relevant (tile-specific), summary strategies
- Interleaved composition for better context flow
- XML serialization option for Claude/GPT-4

### Phase 3: Intelligent Context
- Token-aware optimization with dynamic allocation
- Query-based strategy selection
- Context importance scoring
- Adaptive serialization based on model

### Phase 4: Multi-modal & Advanced
- Include tile visualizations in context
- Add spatial relationship descriptions
- User interaction pattern context
- Memory-augmented context (previous conversations)
- Tool-use context (available actions)

## Testing Strategy

```typescript
// /src/lib/domains/agentic/services/__tests__/context-composition.test.ts

describe('ContextCompositionService', () => {
  it('should compose canvas and chat contexts', async () => {
    const composer = new ContextCompositionService(
      mockCanvasBuilder,
      mockChatBuilder,
      mockTokenizer
    );
    
    const composed = await composer.composeContext(
      'user:123,group:456:1,2',
      mockMessages,
      {
        canvas: { enabled: true, strategy: 'standard' },
        chat: { enabled: true, strategy: 'full' }
      }
    );
    
    expect(composed.contexts).toHaveLength(2);
    expect(composed.contexts[0].type).toBe('canvas');
    expect(composed.contexts[1].type).toBe('chat');
  });
  
  it('should respect token allocation', async () => {
    const composed = await composer.composeContext(
      'user:123,group:456:1,2',
      mockMessages,
      {
        canvas: { enabled: true, strategy: 'standard' },
        chat: { enabled: true, strategy: 'full' },
        composition: {
          maxTotalTokens: 1000,
          tokenAllocation: { canvas: 400, chat: 600 }
        }
      }
    );
    
    const serialized = serializer.serialize(composed, { type: 'structured' });
    const tokens = tokenizer.count(serialized);
    expect(tokens).toBeLessThanOrEqual(1000);
  });
});

describe('Canvas Context Strategies', () => {
  it('should filter empty tiles when configured', async () => {
    const strategy = new StandardCanvasStrategy(mockRepo);
    const context = await strategy.build('center:id', {
      includeEmptyTiles: false
    });
    
    expect(context.children.every(c => c.name)).toBe(true);
  });
});

describe('Chat Context Strategies', () => {
  it('should include all messages with full strategy', async () => {
    const strategy = new FullChatStrategy();
    const context = await strategy.build(mockMessages, {});
    
    expect(context.messages).toHaveLength(mockMessages.length);
  });
  
  it('should limit messages with recent strategy', async () => {
    const strategy = new RecentChatStrategy();
    const context = await strategy.build(mockMessages, {
      maxMessages: 5
    });
    
    expect(context.messages).toHaveLength(5);
    expect(context.messages[0]).toEqual(
      expect.objectContaining({ content: mockMessages[mockMessages.length - 5].content })
    );
  });
});
```

## Configuration

```typescript
// /src/lib/domains/agentic/config/context.config.ts

export const contextConfig = {
  // Default composition for v1
  defaultComposition: {
    canvas: {
      enabled: true,
      strategy: 'standard' as CanvasContextStrategy,
      options: {
        includeEmptyTiles: false,
        includeDescriptions: true
      }
    },
    chat: {
      enabled: true,
      strategy: 'full' as ChatContextStrategy,
      options: {}
    },
    composition: {
      strategy: 'sequential' as const,
      maxTotalTokens: 2000,
      tokenAllocation: {
        canvas: 800,   // 40% for tile context
        chat: 1200     // 60% for conversation
      }
    }
  },
  
  // Canvas strategy configurations
  canvasStrategies: {
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
    },
    focused: {
      maxDepth: 2,
      includeDescriptions: true,
      requiresPositions: true
    }
  },
  
  // Chat strategy configurations
  chatStrategies: {
    full: {
      includeAllMessages: true
    },
    recent: {
      defaultMaxMessages: 10
    },
    relevant: {
      requiresTileContext: true
    },
    summary: {
      summaryThreshold: 20,
      recentCount: 5
    }
  },
  
  // Model-specific token limits
  modelLimits: {
    'gpt-3.5-turbo': { context: 4000, output: 4000 },
    'gpt-4': { context: 8000, output: 4000 },
    'gpt-4-turbo': { context: 128000, output: 4000 },
    'claude-2': { context: 100000, output: 4000 },
    'claude-3-opus': { context: 200000, output: 4000 },
    'claude-3-sonnet': { context: 200000, output: 4000 }
  },
  
  // Serialization preferences by model
  serializationPreferences: {
    'gpt-3.5-turbo': 'structured',
    'gpt-4': 'structured',
    'claude-2': 'xml',
    'claude-3-opus': 'xml',
    'claude-3-sonnet': 'xml'
  },
  
  // Cache configuration
  cache: {
    enabled: true,
    ttl: 5 * 60 * 1000, // 5 minutes
    maxEntries: 100
  }
};
```

## Benefits of This Architecture

1. **True Composition**: Canvas and Chat contexts are independent and composable
2. **Strategy Isolation**: Each context type has its own strategies that evolve independently
3. **Token Awareness**: Built-in token allocation between different context types
4. **Model Optimization**: Different serialization formats for different LLMs
5. **Evolution-Ready**: Can add new context types (e.g., UserContext, ToolContext) without changing existing code
6. **Performance**: Each context type can be cached independently

## Example Usage

```typescript
// In the tRPC router or service layer
const llmService = new LLMIntegrationService(
  contextComposer,
  serializer,
  openRouterClient
);

// Generate response with full context
const response = await llmService.generateResponse(
  chatMessages,
  currentCenterCoordId,
  {
    model: 'anthropic/claude-3-opus',
    temperature: 0.7,
    contextConfig: {
      canvas: {
        strategy: 'standard',  // Center + 2 generations
        includeEmptyTiles: false
      },
      chat: {
        strategy: 'full',      // Entire conversation
        maxMessages: undefined // No limit for v1
      },
      serialization: { type: 'xml' }, // Better for Claude
      maxContextTokens: 3000
    }
  }
);

// The composed context would look like:
/*
<context>
  <canvas_context>
    <center>
      <name>Product Development</name>
      <description>Main product roadmap and features</description>
    </center>
    <children count="6">
      <child position="NW">
        <name>User Research</name>
        <description>Understanding customer needs</description>
      </child>
      <child position="NE">
        <name>Feature Planning</name>
        <description>Prioritizing development work</description>
      </child>
      ...
    </children>
  </canvas_context>
  
  <chat_context>
    <message role="user">
      <content>Help me organize my product development tiles</content>
    </message>
    <message role="assistant">
      <content>I can see you have a Product Development center...</content>
    </message>
    ...
  </chat_context>
</context>
*/
```

## Next Steps

1. Implement core interfaces and base classes
2. Create CanvasContextBuilder with standard strategy
3. Create ChatContextBuilder with full strategy
4. Implement ContextCompositionService
5. Add serialization formats (structured, XML)
6. Integrate with agentic domain service
7. Add comprehensive tests for each component