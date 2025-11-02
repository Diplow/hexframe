import type {
  CompositionConfig,
  ComposedContext,
  Context,
  CanvasContext,
  ChatContext,
  SerializationFormat
} from '~/lib/domains/agentic/types'
import type { MapContext } from '~/lib/domains/mapping'
import type { CanvasContextBuilder } from '~/lib/domains/agentic/services/canvas-context-builder.service'
import type { ChatContextBuilder } from '~/lib/domains/agentic/services/chat-context-builder.service'
import type { TokenizerService } from '~/lib/domains/agentic/services/tokenizer.service'
import type { ChatMessageContract } from '~/lib/domains/agentic/types'

export class ContextCompositionService {
  constructor(
    private readonly canvasBuilder: CanvasContextBuilder,
    private readonly chatBuilder: ChatContextBuilder,
    private readonly tokenizer: TokenizerService
  ) {}

  async composeContext(
    mapContext: MapContext,
    messages: ChatMessageContract[],
    config: CompositionConfig
  ): Promise<ComposedContext> {
    const contexts: Context[] = []

    // Build canvas context if enabled
    if (config.canvas?.enabled) {
      const canvasContext = await this.canvasBuilder.build(
        mapContext,
        config.canvas.strategy,
        config.canvas.options
      )
      contexts.push(canvasContext)
    }
    
    // Build chat context if enabled
    if (config.chat?.enabled) {
      const chatContext = await this.chatBuilder.build(
        messages,
        config.chat.strategy,
        config.chat.options
      )
      contexts.push(chatContext)
    }
    
    // Optimize token allocation if limits specified
    if (config.composition?.maxTotalTokens) {
      return this.optimizeComposition(contexts, config.composition)
    }
    
    const totalTokens = this.estimateTokens(contexts)
    
    return {
      type: 'composed',
      contexts,
      composition: {
        strategy: config.composition?.strategy ?? 'sequential',
        tokenAllocation: config.composition?.tokenAllocation
      },
      metadata: {
        computedAt: new Date(),
        tokenEstimate: totalTokens
      },
      serialize: (format: SerializationFormat) => this.serialize(contexts, format)
    }
  }

  private async optimizeComposition(
    contexts: Context[],
    compositionConfig: NonNullable<CompositionConfig['composition']>
  ): Promise<ComposedContext> {
    const { maxTotalTokens, tokenAllocation } = compositionConfig
    
    // Calculate current token usage
    const tokenUsage = new Map<string, number>()
    let totalTokens = 0
    
    for (const context of contexts) {
      const serialized = context.serialize({ type: 'structured' })
      const tokens = this.tokenizer.count(serialized)
      tokenUsage.set(context.type, tokens)
      totalTokens += tokens
    }
    
    // If within limits, return as-is
    if (totalTokens <= maxTotalTokens!) {
      return {
        type: 'composed',
        contexts,
        composition: {
          strategy: compositionConfig.strategy ?? 'sequential',
          tokenAllocation
        },
        metadata: {
          computedAt: new Date(),
          tokenEstimate: totalTokens
        },
        serialize: (format: SerializationFormat) => this.serialize(contexts, format)
      }
    }
    
    // Optimize by truncating contexts based on allocation
    const optimizedContexts = contexts.map(context => {
      const maxTokensForType = tokenAllocation?.[context.type as keyof typeof tokenAllocation] ?? 
        Math.floor(maxTotalTokens! / contexts.length)
      
      const currentTokens = tokenUsage.get(context.type) ?? 0
      
      if (currentTokens <= maxTokensForType) {
        return context
      }
      
      // For now, we'll just mark that optimization is needed
      // In a real implementation, we'd truncate the context
      return context
    })
    
    return {
      type: 'composed',
      contexts: optimizedContexts,
      composition: {
        strategy: compositionConfig.strategy ?? 'sequential',
        tokenAllocation
      },
      metadata: {
        computedAt: new Date(),
        tokenEstimate: Math.min(totalTokens, maxTotalTokens!)
      },
      serialize: (format: SerializationFormat) => this.serialize(optimizedContexts, format)
    }
  }
  
  private estimateTokens(contexts: Context[]): number {
    return contexts.reduce((total, context) => {
      const serialized = context.serialize({ type: 'structured' })
      return total + this.tokenizer.count(serialized)
    }, 0)
  }
  
  private serialize(
    contexts: Context[],
    format: SerializationFormat
  ): string {
    const parts = contexts.map(ctx => ctx.serialize(format))
    
    if (format.type === 'structured') {
      return parts.join('\n\n---\n\n')
    }
    
    return JSON.stringify({
      contexts: contexts.map(ctx => ({
        type: ctx.type,
        strategy: (ctx as CanvasContext | ChatContext).strategy,
        content: ctx.serialize(format)
      }))
    })
  }
}