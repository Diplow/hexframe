import "server-only"
import { eq, and } from "drizzle-orm"
import { randomBytes } from "crypto"
import { db, schema } from "~/server/db"
import { encrypt, decrypt } from "~/lib/domains/iam/infrastructure/encryption"

const { internalApiKeys } = schema

/**
 * Service for managing internal API keys (encrypted, server-only)
 *
 * These keys are used for server-to-server authentication (e.g., MCP server).
 * Unlike user-facing API keys, these are:
 * - Encrypted (not hashed) so server can retrieve plaintext
 * - Never exposed to client
 * - Auto-managed
 */

const KEY_LENGTH = 64 // 64 characters = 512 bits

function generateApiKey(): string {
  return randomBytes(KEY_LENGTH).toString('base64url')
}

/**
 * Get or create an internal API key for a user and purpose
 *
 * This is idempotent - calling multiple times returns the same key.
 *
 * @param userId - The user ID
 * @param purpose - The purpose identifier (e.g., 'mcp')
 * @returns Plaintext API key
 */
export async function getOrCreateInternalApiKey(
  userId: string,
  purpose: string
): Promise<string> {
  // Try to find existing active key
  const existing = await db.query.internalApiKeys.findFirst({
    where: and(
      eq(internalApiKeys.userId, userId),
      eq(internalApiKeys.purpose, purpose),
      eq(internalApiKeys.isActive, true)
    )
  })

  if (existing) {
    // Update last used timestamp
    await db.update(internalApiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(internalApiKeys.id, existing.id))

    // Decrypt and return
    return decrypt(existing.encryptedKey)
  }

  // Create new key
  const plaintextKey = generateApiKey()
  const encryptedKey = encrypt(plaintextKey)

  await db.insert(internalApiKeys).values({
    id: crypto.randomUUID(),
    userId,
    purpose,
    encryptedKey,
    isActive: true,
    createdAt: new Date(),
  })

  return plaintextKey
}

/**
 * Rotate an internal API key
 *
 * Deactivates the old key and creates a new one.
 *
 * @param userId - The user ID
 * @param purpose - The purpose identifier
 * @returns New plaintext API key
 */
export async function rotateInternalApiKey(
  userId: string,
  purpose: string
): Promise<string> {
  // Deactivate old key
  await db.update(internalApiKeys)
    .set({ isActive: false })
    .where(and(
      eq(internalApiKeys.userId, userId),
      eq(internalApiKeys.purpose, purpose)
    ))

  // Create new key (getOrCreateInternalApiKey will create since old is inactive)
  return getOrCreateInternalApiKey(userId, purpose)
}

/**
 * Validate an internal API key and return the user ID
 *
 * @param plaintextKey - The plaintext API key to validate
 * @param userId - Optional userId hint to optimize lookup (only checks this user's keys)
 * @returns User ID and purpose if valid, null otherwise
 */
export async function validateInternalApiKey(
  plaintextKey: string,
  userId?: string
): Promise<{ userId: string; purpose: string } | null> {
  // If userId provided, use fast path: only check this user's keys
  if (userId) {
    const userKeys = await db.query.internalApiKeys.findMany({
      where: and(
        eq(internalApiKeys.userId, userId),
        eq(internalApiKeys.isActive, true)
      )
    })

    for (const key of userKeys) {
      try {
        const decrypted = decrypt(key.encryptedKey)

        if (decrypted === plaintextKey) {
          // Update last used
          await db.update(internalApiKeys)
            .set({ lastUsedAt: new Date() })
            .where(eq(internalApiKeys.id, key.id))

          return {
            userId: key.userId,
            purpose: key.purpose
          }
        }
      } catch {
        // Decryption failed, skip this key
        continue
      }
    }

    return null
  }

  // Fallback: check all keys (for backwards compatibility or when userId not provided)
  // This is more expensive but ensures validation works even without userId hint
  const allKeys = await db.query.internalApiKeys.findMany({
    where: eq(internalApiKeys.isActive, true)
  })

  for (const key of allKeys) {
    try {
      const decrypted = decrypt(key.encryptedKey)

      if (decrypted === plaintextKey) {
        // Update last used
        await db.update(internalApiKeys)
          .set({ lastUsedAt: new Date() })
          .where(eq(internalApiKeys.id, key.id))

        return {
          userId: key.userId,
          purpose: key.purpose
        }
      }
    } catch {
      // Decryption failed, skip this key
      continue
    }
  }

  return null
}
