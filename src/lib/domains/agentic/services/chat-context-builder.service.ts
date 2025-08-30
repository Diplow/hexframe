import type { 
  ChatContext, 
  ChatContextOptions, 
  ChatContextStrategy 
} from '../types'
import type { IChatStrategy } from '~/lib/domains/agentic/services/chat-strategies/strategy.interface'
import type { ChatMessage } from '~/app/map'

export class ChatContextBuilder {
  constructor(
    private readonly strategies: Map<ChatContextStrategy, IChatStrategy>
  ) {}

  async build(
    messages: ChatMessage[],
    strategy: ChatContextStrategy,
    options?: ChatContextOptions
  ): Promise<ChatContext> {
    const strategyImpl = this.strategies.get(strategy) ?? this.strategies.get('full')!
    return strategyImpl.build(messages, options ?? {})
  }
}