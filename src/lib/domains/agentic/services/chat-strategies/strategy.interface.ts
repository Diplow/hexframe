import type { ChatContext, ChatContextOptions } from '../../types'
import type { ChatMessage } from '~/app/map/Chat/types'

export interface IChatStrategy {
  build(
    messages: ChatMessage[],
    options: ChatContextOptions
  ): Promise<ChatContext>
}