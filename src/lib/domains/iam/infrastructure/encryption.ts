import "server-only"
import crypto from 'crypto'

/**
 * Encryption utilities for internal API keys
 *
 * Uses AES-256-GCM for authenticated encryption.
 *
 * IMPORTANT: Requires ENCRYPTION_KEY environment variable (64 hex chars = 32 bytes)
 * Generate with: node -e "console.log(crypto.randomBytes(32).toString('hex'))"
 */

const ALGORITHM = 'aes-256-gcm'

function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY

  if (!keyHex) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required. ' +
      'Generate with: node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))"'
    )
  }

  const key = Buffer.from(keyHex, 'hex')

  if (key.length !== 32) {
    throw new Error(
      'ENCRYPTION_KEY must be 32 bytes (64 hex characters). ' +
      'Generate with: node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))"'
    )
  }

  return key
}

/**
 * Encrypt plaintext using AES-256-GCM
 *
 * Returns format: iv:encrypted:authTag (all hex-encoded)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(16)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ])
  const authTag = cipher.getAuthTag()

  return [
    iv.toString('hex'),
    encrypted.toString('hex'),
    authTag.toString('hex')
  ].join(':')
}

/**
 * Decrypt ciphertext using AES-256-GCM
 *
 * Expects format: iv:encrypted:authTag (all hex-encoded)
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey()
  const [ivHex, encryptedHex, authTagHex] = ciphertext.split(':')

  if (!ivHex || !encryptedHex || !authTagHex) {
    throw new Error('Invalid ciphertext format. Expected: iv:encrypted:authTag')
  }

  const iv = Buffer.from(ivHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]).toString('utf8')
}
