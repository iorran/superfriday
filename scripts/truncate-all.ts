#!/usr/bin/env tsx
/**
 * Truncate Database and Storage Script
 * WARNING: This script will DELETE ALL DATA from the database and storage!
 * Use with extreme caution.
 * 
 * This script will:
 * 1. Delete all documents from application collections (keeps Better Auth collections)
 * 2. Delete all files from Vercel Blob storage
 */

// CRITICAL: Load environment variables FIRST, before any other imports
// This must happen before importing lib/db.ts which checks env vars at module level
import { config } from 'dotenv'
import { resolve } from 'path'
import { existsSync } from 'fs'

// Try to load .env.local, fallback to .env if .env.local doesn't exist
const envLocalPath = resolve(process.cwd(), '.env.local')
const envPath = resolve(process.cwd(), '.env')

let envLoaded = false
if (existsSync(envLocalPath)) {
  const result = config({ path: envLocalPath, override: true })
  if (result.error) {
    console.error('❌ Error loading .env.local:', result.error)
  } else {
    console.log('✓ Loaded environment variables from .env.local')
    envLoaded = true
  }
} else if (existsSync(envPath)) {
  const result = config({ path: envPath, override: true })
  if (result.error) {
    console.error('❌ Error loading .env:', result.error)
  } else {
    console.log('✓ Loaded environment variables from .env')
    envLoaded = true
  }
} else {
  console.warn('⚠️  No .env.local or .env file found')
  console.warn(`   Looked in: ${process.cwd()}`)
}

// Also try loading with dotenv/config as fallback (loads .env.local automatically)
if (!envLoaded) {
  try {
    // This will try to load .env.local automatically
    const result = config({ override: true })
    if (!result.error) {
      envLoaded = true
      console.log('✓ Loaded environment variables using default dotenv behavior')
    }
  } catch (e) {
    // Ignore
  }
}

// Verify MONGODB_URI is loaded before importing modules that depend on it
if (!process.env.MONGODB_URI && !process.env.DATABASE_URL) {
  console.error('\n❌ Error: MONGODB_URI or DATABASE_URL not found in environment')
  console.error('   Please ensure .env.local exists and contains MONGODB_URI')
  console.error(`   Current working directory: ${process.cwd()}`)
  console.error(`   Expected file: ${envLocalPath}`)
  if (envLoaded) {
    console.error('   Note: .env file was loaded but MONGODB_URI was not found')
    console.error('   Available env vars:', Object.keys(process.env).filter(k => k.includes('MONGO') || k.includes('DATABASE')).join(', ') || 'none')
  }
  process.exit(1)
}

console.log(`✓ MONGODB_URI found: ${process.env.MONGODB_URI?.substring(0, 20)}...\n`)

// Now import other modules after environment variables are loaded
import { list, del } from '@vercel/blob'
import { MongoClient } from 'mongodb'

// Collections to truncate (application collections)
// Better Auth collections (user, session, etc.) are preserved
const COLLECTIONS_TO_TRUNCATE = [
  'clients',
  'invoices',
  'invoice_files',
  'email_history',
  'email_templates',
  'settings',
]

async function truncateDatabase() {
  // Check environment variables again after loading
  const databaseUrl = process.env.MONGODB_URI || process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error('❌ Error: MONGODB_URI or DATABASE_URL environment variable is required')
    console.error('   Please ensure .env.local exists and contains MONGODB_URI')
    console.error(`   Current working directory: ${process.cwd()}`)
    console.error(`   Looking for: ${resolve(process.cwd(), '.env.local')}`)
    process.exit(1)
  }

  let client: MongoClient | null = null

  try {
    console.log('🗄️  Starting database truncation...\n')
    console.log(`   Using database: ${databaseUrl.split('@')[1]?.split('/')[0] || 'MongoDB'}\n`)

    // Create MongoDB connection directly (avoiding lib/db.ts module-level check)
    client = new MongoClient(databaseUrl, {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    })

    await client.connect()
    console.log('✓ Connected to MongoDB\n')

    const dbName = databaseUrl.split('/').pop()?.split('?')[0] || 'superfriday'
    const db = client.db(dbName)

    // Get all collections
    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map((col) => col.name)

    console.log(`Found ${collectionNames.length} collections in database`)

    // Truncate each application collection
    let totalDeleted = 0
    for (const collectionName of COLLECTIONS_TO_TRUNCATE) {
      if (collectionNames.includes(collectionName)) {
        const collection = db.collection(collectionName)
        const count = await collection.countDocuments()
        
        if (count > 0) {
          const result = await collection.deleteMany({})
          console.log(`  ✓ Deleted ${result.deletedCount} documents from '${collectionName}'`)
          totalDeleted += result.deletedCount
        } else {
          console.log(`  - Collection '${collectionName}' is already empty`)
        }
      } else {
        console.log(`  - Collection '${collectionName}' does not exist`)
      }
    }

    // List Better Auth collections that are preserved
    const betterAuthCollections = collectionNames.filter(
      (name) => 
        name.startsWith('better-auth_') || 
        name === 'user' || 
        name === 'session' ||
        name === 'account' ||
        name === 'verification'
    )

    if (betterAuthCollections.length > 0) {
      console.log(`\n  ℹ️  Preserved Better Auth collections: ${betterAuthCollections.join(', ')}`)
    }

    console.log(`\n✅ Database truncation complete! Deleted ${totalDeleted} documents total.\n`)
  } catch (error) {
    console.error('❌ Error truncating database:', error)
    throw error
  } finally {
    // Close MongoDB connection
    if (client) {
      await client.close()
      console.log('✓ MongoDB connection closed')
    }
  }
}

async function truncateStorage() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('❌ Error: BLOB_READ_WRITE_TOKEN environment variable is required')
    process.exit(1)
  }

  try {
    console.log('📦 Starting storage truncation...\n')

    // List all files in blob storage (handle pagination)
    console.log('Listing all files in blob storage...')
    const allBlobs: Array<{ pathname: string; size: number }> = []
    let cursor: string | undefined = undefined
    let hasMore = true

    while (hasMore) {
      const blobFiles: { 
        blobs: Array<{ pathname: string; size: number }>; 
        hasMore: boolean; 
        cursor?: string 
      } = await list({
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

    console.log(`Found ${allBlobs.length} file(s) in blob storage\n`)

    if (allBlobs.length === 0) {
      console.log('✅ Storage is already empty!')
      return
    }

    // Calculate total size
    const totalSize = allBlobs.reduce((sum, blob) => sum + blob.size, 0)
    const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2)
    console.log(`Total storage size: ${totalSizeMB} MB\n`)

    // Delete all files
    console.log('Deleting files...')
    let deletedCount = 0
    let failedCount = 0

    for (const blob of allBlobs) {
      try {
        await del(blob.pathname, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        })
        deletedCount++
        if (deletedCount % 10 === 0) {
          process.stdout.write(`  Deleted ${deletedCount}/${allBlobs.length} files...\r`)
        }
      } catch (error: unknown) {
        failedCount++
        const errorObj = error as { status?: number; message?: string }
        console.error(`\n  ⚠️  Failed to delete ${blob.pathname}: ${errorObj.message || 'Unknown error'}`)
      }
    }

    console.log(`\n✅ Storage truncation complete!`)
    console.log(`  ✓ Deleted: ${deletedCount} files`)
    if (failedCount > 0) {
      console.log(`  ⚠️  Failed: ${failedCount} files`)
    }
    console.log(`  💾 Freed: ${totalSizeMB} MB\n`)
  } catch (error) {
    console.error('❌ Error truncating storage:', error)
    throw error
  }
}

async function main() {
  console.log('⚠️  WARNING: This script will DELETE ALL DATA from the database and storage!')
  console.log('⚠️  Better Auth collections (users, sessions) will be preserved.\n')

  // In a real scenario, you might want to add a confirmation prompt
  // For now, we'll just proceed

  try {
    // Truncate database first
    await truncateDatabase()

    // Then truncate storage
    await truncateStorage()

    console.log('🎉 All truncation operations completed successfully!')
  } catch (error) {
    console.error('\n❌ Fatal error during truncation:', error)
    process.exit(1)
  }
}

// Run the script
main()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
