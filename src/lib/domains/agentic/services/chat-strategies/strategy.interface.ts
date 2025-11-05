import type { ChatContext, ChatContextOptions } from '~/lib/domains/agentic/types'
import type { ChatMessageContract as ChatMessage } from '~/lib/domains/agentic/types'

export interface IChatStrategy {
  build(
    messages: ChatMessage[],
    options: ChatContextOptions
  ): Promise<ChatContext>
}