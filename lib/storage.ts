/**
 * File Storage Client
 * Uses Vercel Blob for file storage
 */

import { put, get, del, head } from '@vercel/blob'

/**
 * Upload a file to Vercel Blob
 */
export async function uploadFile(fileKey: string, fileBuffer: Buffer, contentType: string): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN environment variable is required')
  }

  await put(fileKey, fileBuffer, {
    access: 'public',
    contentType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })
}

/**
 * Get a file from Vercel Blob
 */
export async function getFile(fileKey: string): Promise<Buffer | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN environment variable is required')
  }

  try {
    const blob = await get(fileKey, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    if (!blob) return null

    // Convert Blob to Buffer
    const arrayBuffer = await blob.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error: any) {
    // Return null if file not found
    if (error.status === 404 || error.message?.includes('not found')) {
      return null
    }
    throw error
  }
}

/**
 * Delete a file from Vercel Blob
 */
export async function deleteFile(fileKey: string): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN environment variable is required')
  }

  try {
    await del(fileKey, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
  } catch (error: any) {
    // Ignore if file doesn't exist
    if (error.status === 404 || error.message?.includes('not found')) {
      return
    }
    throw error
  }
}

/**
 * Get file download URL
 * Vercel Blob provides public URLs automatically
 */
export async function getFileUrl(fileKey: string): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN environment variable is required')
  }

  try {
    const blob = await head(fileKey, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
    return blob.url
  } catch (error: any) {
    // Fallback to API route if head fails
    return `/api/files/${fileKey}`
  }
}
