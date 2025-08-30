import type { ChatContext, ChatContextOptions } from '~/lib/domains/agentic/types'
import type { ChatMessage } from '~/app/map'

export interface IChatStrategy {
  build(
    messages: ChatMessage[],
    options: ChatContextOptions
  ): Promise<ChatContext>
}