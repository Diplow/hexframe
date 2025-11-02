/**
 * Contract Converters
 *
 * Utilities to convert frontend types to backend contracts.
 * This decouples frontend implementation from backend API contracts.
 */

import type { CacheState } from '~/app/map/Cache/State/types'
import type { ChatMessage } from '~/app/map/Chat/types'
import type { AIContextSnapshot, ChatMessageContract } from '~/lib/domains/agentic'

/**
 * Convert frontend CacheState to AI context snapshot
 *
 * Creates hierarchical structure with varying detail levels:
 * - Center: full title + content + coordinates
 * - Children (depth 1 from center): title + preview + coordinates
 * - Grandchildren (depth 2 from center): title + coordinates
 */
export function convertCacheStateToAISnapshot(cacheState: CacheState): AIContextSnapshot {
  const centerCoordId = cacheState.currentCenter

  if (!centerCoordId) {
    return {
      centerCoordId: null,
      composed: [],
      children: [],
      grandchildren: [],
      expandedTileIds: cacheState.expandedItemIds
    }
  }

  const centerTile = cacheState.itemsById[centerCoordId]
  if (!centerTile) {
    return {
      centerCoordId,
      composed: [],
      children: [],
      grandchildren: [],
      expandedTileIds: cacheState.expandedItemIds
    }
  }

  const centerDepth = centerTile.metadata.coordinates.path.length
  const centerPath = centerTile.metadata.coordinates.path
  const centerUserId = centerTile.metadata.coordinates.userId
  const centerGroupId = centerTile.metadata.coordinates.groupId

  // Helper to check if a tile is a descendant of center
  const isDescendant = (tile: typeof centerTile): boolean => {
    const coords = tile.metadata.coordinates
    return (
      coords.userId === centerUserId &&
      coords.groupId === centerGroupId &&
      coords.path.length > centerDepth &&
      centerPath.every((val, idx) => coords.path[idx] === val)
    )
  }

  // Helper to get relative depth from center
  const getRelativeDepth = (tile: typeof centerTile): number => {
    return tile.metadata.coordinates.path.length - centerDepth
  }

  // Helper to check if a tile is composed (direction 0)
  const isComposed = (tile: typeof centerTile): boolean => {
    const coords = tile.metadata.coordinates
    if (coords.path.length !== centerDepth + 2) return false

    const directionValue = coords.path[centerDepth] as number
    return (
      coords.userId === centerUserId &&
      coords.groupId === centerGroupId &&
      centerPath.every((val, idx) => coords.path[idx] === val) &&
      directionValue === 0 // Direction 0 means composed
    )
  }

  // Separate tiles by hierarchy
  const composed: AIContextSnapshot['composed'] = []
  const children: AIContextSnapshot['children'] = []
  const grandchildren: AIContextSnapshot['grandchildren'] = []

  Object.values(cacheState.itemsById).forEach(tile => {
    if (tile.metadata.coordId === centerCoordId) return

    // Check for composed tiles first (special case: direction 0)
    if (isComposed(tile)) {
      composed.push({
        coordId: tile.metadata.coordId,
        coordinates: tile.metadata.coordinates,
        title: tile.data.title,
        content: tile.data.content
      })
      return
    }

    if (!isDescendant(tile)) return

    const relativeDepth = getRelativeDepth(tile)

    if (relativeDepth === 1) {
      // Direct children: include preview
      children.push({
        coordId: tile.metadata.coordId,
        coordinates: tile.metadata.coordinates,
        title: tile.data.title,
        preview: tile.data.preview ?? tile.data.content.substring(0, 200)
      })
    } else if (relativeDepth === 2) {
      // Grandchildren: just title and coordinates
      grandchildren.push({
        coordId: tile.metadata.coordId,
        coordinates: tile.metadata.coordinates,
        title: tile.data.title
      })
    }
  })

  return {
    centerCoordId,
    center: {
      coordId: centerTile.metadata.coordId,
      coordinates: centerTile.metadata.coordinates,
      title: centerTile.data.title,
      content: centerTile.data.content
    },
    composed,
    children,
    grandchildren,
    expandedTileIds: cacheState.expandedItemIds
  }
}

/**
 * Convert frontend ChatMessage to backend contract
 *
 * Serializes widgets and metadata for backend consumption.
 */
export function convertChatMessageToContract(message: ChatMessage): ChatMessageContract {
  return {
    id: message.id,
    type: message.type,
    content: typeof message.content === 'string'
      ? message.content
      : JSON.stringify(message.content), // Serialize widgets to JSON string
    metadata: message.metadata ? {
      tileId: message.metadata.tileId,
      timestamp: message.metadata.timestamp.toISOString()
    } : undefined
  }
}

/**
 * Batch convert chat messages
 */
export function convertChatMessagesToContracts(messages: ChatMessage[]): ChatMessageContract[] {
  return messages.map(convertChatMessageToContract)
}
