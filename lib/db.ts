/**
 * MongoDB Database Client
 * Uses mongodb driver for database operations
 * Compatible with MongoDB Atlas from Vercel
 * 
 * Uses a singleton pattern that works well with Next.js hot reload
 */

import { MongoClient, Db } from 'mongodb'

// Get database URL from environment variable
const databaseUrl = process.env.MONGODB_URI || process.env.DATABASE_URL

if (!databaseUrl) {
  console.warn('Warning: MONGODB_URI or DATABASE_URL environment variable is not set')
}

// Use global to store the client in development (prevents multiple connections during hot reload)
declare global {
  var _mongoClient: MongoClient | undefined
  var _mongoDb: Db | undefined
}

let client: MongoClient | null = null
let db: Db | null = null

/**
 * Get MongoDB database instance
 * Uses singleton pattern for connection reuse
 */
export async function getDatabase(): Promise<Db> {
  if (!databaseUrl) {
    throw new Error('MONGODB_URI or DATABASE_URL environment variable is required')
  }

  // In development, use global to prevent multiple connections during hot reload
  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClient) {
      global._mongoClient = new MongoClient(databaseUrl)
      await global._mongoClient.connect()
      console.log('MongoDB connected (development)')
    }
    client = global._mongoClient

    if (!global._mongoDb) {
      const dbName = databaseUrl.split('/').pop()?.split('?')[0] || 'superfriday'
      global._mongoDb = global._mongoClient.db(dbName)
    }
    db = global._mongoDb
  } else {
    // In production, create new connection if needed
    if (!client) {
      client = new MongoClient(databaseUrl)
      await client.connect()
      console.log('MongoDB connected (production)')
    }

    if (!db) {
      const dbName = databaseUrl.split('/').pop()?.split('?')[0] || 'superfriday'
      db = client.db(dbName)
    }
  }

  return db
}

/**
 * Initialize database with schema (creates indexes)
 * MongoDB doesn't have a schema file, but we can create indexes
 */
export async function initDatabase() {
  if (!databaseUrl) {
    throw new Error('MONGODB_URI or DATABASE_URL environment variable is required')
  }

  const database = await getDatabase()

  try {
    // Create indexes for better performance
    const clientsCollection = database.collection('clients')
    await clientsCollection.createIndex({ name: 1 })
    await clientsCollection.createIndex({ email: 1 })

    const invoicesCollection = database.collection('invoices')
    await invoicesCollection.createIndex({ client_id: 1 })
    await invoicesCollection.createIndex({ year: -1, month: -1 })
    await invoicesCollection.createIndex({ sent_to_client: 1 })
    await invoicesCollection.createIndex({ sent_to_accountant: 1 })
    await invoicesCollection.createIndex({ payment_received: 1 })

    const invoiceFilesCollection = database.collection('invoice_files')
    await invoiceFilesCollection.createIndex({ invoice_id: 1 })
    await invoiceFilesCollection.createIndex({ file_key: 1 })

    const emailHistoryCollection = database.collection('email_history')
    await emailHistoryCollection.createIndex({ invoice_id: 1 })
    await emailHistoryCollection.createIndex({ sent_at: -1 })

    const emailTemplatesCollection = database.collection('email_templates')
    await emailTemplatesCollection.createIndex({ type: 1 })

    const settingsCollection = database.collection('settings')
    await settingsCollection.createIndex({ key: 1 }, { unique: true })

    // Insert default settings if they don't exist
    await settingsCollection.updateOne(
      { key: 'accountant_email' },
      { $setOnInsert: { key: 'accountant_email', value: '', updated_at: new Date() } },
      { upsert: true }
    )

    console.log('Database initialized successfully')
  } catch (error: unknown) {
    console.error('Error initializing database:', error)
    throw error
  }
}
