/**
 * Encryption utilities for sensitive data
 * Uses AES-256-GCM for encryption/decryption
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

/**
 * Get encryption key from environment variable
 */
const getEncryptionKey = (): Buffer => {
  const key = process.env.GOOGLE_OAUTH_ENCRYPTION_KEY
  if (!key) {
    throw new Error('GOOGLE_OAUTH_ENCRYPTION_KEY environment variable is required')
  }
  
  // Key should be base64 encoded, decode it
  try {
    const decoded = Buffer.from(key, 'base64')
    if (decoded.length !== 32) {
      throw new Error('Encryption key must be 32 bytes (base64 encoded)')
    }
    return decoded
  } catch {
    throw new Error('Invalid encryption key format. Must be base64 encoded 32-byte key.')
  }
}

/**
 * Encrypt a string value
 */
export const encrypt = (value: string): string => {
  if (!value) {
    return value
  }
  
  try {
    const key = getEncryptionKey()
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, key, iv)
    
    let encrypted = cipher.update(value, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const tag = cipher.getAuthTag()
    
    // Combine IV + tag + encrypted data
    const combined = Buffer.concat([
      iv,
      tag,
      Buffer.from(encrypted, 'hex'),
    ])
    
    return combined.toString('base64')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Encryption error details:', {
      error: errorMessage,
      hasKey: !!process.env.GOOGLE_OAUTH_ENCRYPTION_KEY,
      keyLength: process.env.GOOGLE_OAUTH_ENCRYPTION_KEY?.length,
      valueType: typeof value,
      valueLength: value?.length,
    })
    throw new Error(`Failed to encrypt value: ${errorMessage}`)
  }
}

/**
 * Decrypt a string value
 */
export const decrypt = (encryptedValue: string): string => {
  if (!encryptedValue) {
    return encryptedValue
  }
  
  try {
    const key = getEncryptionKey()
    const combined = Buffer.from(encryptedValue, 'base64')
    
    // Extract IV, tag, and encrypted data
    const iv = combined.subarray(0, IV_LENGTH)
    const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
    const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH)
    
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch {
    throw new Error('Failed to decrypt value')
  }
}




