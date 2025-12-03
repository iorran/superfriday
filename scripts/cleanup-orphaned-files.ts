/**
 * Cleanup Orphaned Files Script
 * Identifies and deletes files in Vercel Blob storage that are not referenced in the database
 */

import { list, del } from '@vercel/blob'
import { executeQuery, getDatabase, closeDatabase } from '../lib/db'

async function cleanupOrphanedFiles() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('Error: BLOB_READ_WRITE_TOKEN environment variable is required')
    process.exit(1)
  }

  try {
    console.log('Starting cleanup of orphaned files...\n')

    // Get all file keys from database
    const filesResult = executeQuery('SELECT file_key FROM invoice_files')
    const dbFileKeys = new Set(
      ((filesResult.results || []) as Array<{ file_key: string }>).map((row) => row.file_key)
    )

    console.log(`Found ${dbFileKeys.size} files in database`)

    // List all files in blob storage (handle pagination)
    console.log('Listing files in blob storage...')
    const allBlobs: Array<{ pathname: string; size: number }> = []
    let cursor: string | undefined = undefined
    let hasMore = true

    while (hasMore) {
      const blobFiles: { blobs: Array<{ pathname: string; size: number }>; hasMore: boolean; cursor?: string } = await list({
        token: process.env.BLOB_READ_WRITE_TOKEN,
        cursor,
        limit: 1000, // Maximum per request
      })

      allBlobs.push(...blobFiles.blobs.map((blob) => ({
        pathname: blob.pathname,
        size: blob.size,
      })))

      hasMore = blobFiles.hasMore
      cursor = blobFiles.cursor
    }

    console.log(`Found ${allBlobs.length} files in blob storage\n`)

    // Find orphaned files (files in storage but not in database)
    const orphanedFiles = allBlobs.filter(
      (blob) => !dbFileKeys.has(blob.pathname)
    )

    if (orphanedFiles.length === 0) {
      console.log('✅ No orphaned files found. Storage is clean!')
      return
    }

    console.log(`Found ${orphanedFiles.length} orphaned file(s):\n`)

    let totalSizeDeleted = 0
    let deletedCount = 0
    let failedCount = 0

    // Delete orphaned files
    for (const file of orphanedFiles) {
      try {
        const sizeKB = (file.size / 1024).toFixed(2)
        console.log(`  - Deleting: ${file.pathname} (${sizeKB} KB)`)
        
        await del(file.pathname, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        })

        totalSizeDeleted += file.size
        deletedCount++
      } catch (error: unknown) {
        console.error(`  ❌ Failed to delete ${file.pathname}:`, error)
        failedCount++
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log('Cleanup Summary:')
    console.log(`  Total orphaned files: ${orphanedFiles.length}`)
    console.log(`  Successfully deleted: ${deletedCount}`)
    console.log(`  Failed to delete: ${failedCount}`)
    console.log(`  Space freed: ${(totalSizeDeleted / 1024 / 1024).toFixed(2)} MB`)
    console.log('='.repeat(50))

    if (deletedCount > 0) {
      console.log('\n✅ Cleanup completed successfully!')
    }
  } catch (error: unknown) {
    console.error('\n❌ Error during cleanup:', error)
    process.exit(1)
  } finally {
    closeDatabase()
  }
}

// Run cleanup
cleanupOrphanedFiles()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

