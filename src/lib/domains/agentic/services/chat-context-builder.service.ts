import type { 
  ChatContext, 
  ChatContextOptions, 
  ChatContextStrategy 
} from '~/lib/domains/agentic/types'
import type { IChatStrategy } from '~/lib/domains/agentic/services/chat-strategies/strategy.interface'
import type { ChatMessageContract } from '~/lib/domains/agentic/types'

export class ChatContextBuilder {
  constructor(
    private readonly strategies: Map<ChatContextStrategy, IChatStrategy>
  ) {}

  async build(
    messages: ChatMessageContract[],
    strategy: ChatContextStrategy,
    options?: ChatContextOptions
  ): Promise<ChatContext> {
    const strategyImpl = this.strategies.get(strategy) ?? this.strategies.get('full')!
    return strategyImpl.build(messages, options ?? {})
  }
}