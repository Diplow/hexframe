/**
 * Mutation Notification Registry
 *
 * Bridges the gap between SSE streaming and MCP tool calls using Redis.
 * Since SSE and MCP endpoints run in separate processes, we use Redis
 * as a shared message queue.
 *
 * Flow:
 * 1. MCP handler calls pushMutation(apiKey, event) → stores in Redis
 * 2. SSE endpoint calls popMutations(apiKey) → retrieves and clears from Redis
 * 3. SSE emits the mutations before sending "done"
 */

import { Redis } from '@upstash/redis'
import type { TileMutationEvent } from '~/lib/domains/agentic/types/stream.types'

/**
 * Redis key prefix for mutation queues
 */
const MUTATION_KEY_PREFIX = 'mutation-queue:'

/**
 * TTL for mutation entries (30 seconds - enough time for stream to complete)
 */
const MUTATION_TTL_SECONDS = 30

/**
 * Get or create Redis client (lazy initialization)
 */
let redisClient: Redis | null = null

function _getRedis(): Redis | null {
  if (redisClient) return redisClient

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!redisUrl || !redisToken) {
    console.log('[MutationRegistry] Redis not configured, mutations will not be bridged across processes')
    return null
  }

  redisClient = new Redis({ url: redisUrl, token: redisToken })
  return redisClient
}

function _getMutationKey(apiKey: string): string {
  return `${MUTATION_KEY_PREFIX}${apiKey}`
}

/**
 * Push a mutation event to Redis for a given API key
 * Called from MCP tool handlers after successful mutations
 */
export async function pushMutation(apiKey: string, event: TileMutationEvent): Promise<void> {
  const redis = _getRedis()
  if (!redis) {
    console.log('[MutationRegistry] No Redis, skipping pushMutation')
    return
  }

  const key = _getMutationKey(apiKey)
  console.log('[MutationRegistry] Pushing mutation to Redis:', key.substring(0, 30) + '...', event.mutation)

  try {
    // Push to list and set TTL
    await redis.rpush(key, JSON.stringify(event))
    await redis.expire(key, MUTATION_TTL_SECONDS)
    console.log('[MutationRegistry] Mutation pushed successfully')
  } catch (error) {
    console.error('[MutationRegistry] Failed to push mutation:', error)
  }
}

/**
 * Pop all pending mutations for a given API key from Redis
 * Called from SSE endpoint before sending "done" event
 * Returns mutations in order they were received and clears the queue
 */
export async function popMutations(apiKey: string): Promise<TileMutationEvent[]> {
  const redis = _getRedis()
  if (!redis) {
    console.log('[MutationRegistry] No Redis, returning empty mutations')
    return []
  }

  const key = _getMutationKey(apiKey)
  console.log('[MutationRegistry] Popping mutations from Redis:', key.substring(0, 30) + '...')

  try {
    // Get all items from the list
    const items = await redis.lrange(key, 0, -1)
    console.log('[MutationRegistry] Found', items.length, 'mutations')

    if (items.length === 0) {
      return []
    }

    // Delete the key after reading
    await redis.del(key)

    // Parse and return events
    const events: TileMutationEvent[] = []
    for (const item of items) {
      try {
        const event: unknown = typeof item === 'string' ? JSON.parse(item) : item
        events.push(event as TileMutationEvent)
      } catch (parseError) {
        console.error('[MutationRegistry] Failed to parse mutation:', parseError)
      }
    }

    console.log('[MutationRegistry] Returning', events.length, 'mutations')
    return events
  } catch (error) {
    console.error('[MutationRegistry] Failed to pop mutations:', error)
    return []
  }
}

// ============================================================================
// Legacy in-memory functions (kept for compatibility, but won't work cross-process)
// ============================================================================

type MutationEmitter = (event: TileMutationEvent) => void
const emitterRegistry = new Map<string, MutationEmitter>()

/**
 * @deprecated Use pushMutation/popMutations instead for cross-process support
 */
export function registerMutationEmitter(apiKey: string, emitter: MutationEmitter): () => void {
  console.log('[MutationRegistry] Registering emitter for apiKey:', apiKey.substring(0, 8) + '...')
  emitterRegistry.set(apiKey, emitter)

  return () => {
    console.log('[MutationRegistry] Unregistering emitter for apiKey:', apiKey.substring(0, 8) + '...')
    emitterRegistry.delete(apiKey)
  }
}

/**
 * @deprecated Use pushMutation/popMutations instead for cross-process support
 */
export function notifyMutation(apiKey: string, event: TileMutationEvent): void {
  // Try in-memory first (same process)
  const emitter = emitterRegistry.get(apiKey)
  if (emitter) {
    console.log('[MutationRegistry] Found in-memory emitter, sending event:', event.mutation)
    emitter(event)
    return
  }

  // Fall back to Redis (cross-process)
  console.log('[MutationRegistry] No in-memory emitter, pushing to Redis')
  void pushMutation(apiKey, event)
}
