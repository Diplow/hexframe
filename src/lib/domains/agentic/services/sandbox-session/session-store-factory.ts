/**
 * Session store factory.
 *
 * Creates the appropriate session store based on environment configuration.
 */

import { Redis } from '@upstash/redis'
import type { ISessionStore } from '~/lib/domains/agentic/services/sandbox-session/redis-session-store'
import { MemorySessionStore, RedisSessionStore } from '~/lib/domains/agentic/services/sandbox-session/redis-session-store'

/**
 * Create a session store based on environment configuration.
 * Uses Redis if UPSTASH_REDIS_REST_URL is configured, otherwise falls back to memory.
 */
export function createSessionStore(defaultTtlSeconds = 300): ISessionStore {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (redisUrl && redisToken) {
    console.log('[SessionStore] Using Redis-backed session store')
    const redis = new Redis({
      url: redisUrl,
      token: redisToken
    })
    return new RedisSessionStore(redis, defaultTtlSeconds)
  }

  console.log('[SessionStore] Redis not configured, using in-memory store (sessions will not persist across cold starts)')
  return new MemorySessionStore()
}
