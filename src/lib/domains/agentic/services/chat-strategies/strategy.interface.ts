import type { ChatContext, ChatContextOptions } from '../../types'
import type { ChatMessage } from '~/app/map/interface'

export interface IChatStrategy {
  build(
    messages: ChatMessage[],
    options: ChatContextOptions
  ): Promise<ChatContext>
}