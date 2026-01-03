/**
 * Formats chat messages into a discussion string for USER tile context
 * @module _discussion-formatter
 */

import type { Message } from '~/app/map/Chat/_state/_events'

/**
 * Format chat messages as a discussion string for AI context
 * @param messages - Array of chat messages
 * @returns Formatted discussion string or undefined if no messages
 */
export function formatDiscussion(messages: Message[]): string | undefined {
  if (messages.length === 0) return undefined

  const formatted = messages.map(msg => {
    const actorLabel = msg.actor === 'user' ? 'User'
      : msg.actor === 'assistant' ? 'Assistant'
      : 'System'
    return `[${actorLabel}]: ${msg.content}`
  })

  return formatted.join('\n\n')
}
