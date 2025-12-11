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
  throw new Error('MONGODB_URI or DATABASE_URL environment variable is required')
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

  // Connection pool options for better performance
  const clientOptions = {
    maxPoolSize: 10, // Maximum number of connections in the pool
    minPoolSize: 2, // Minimum number of connections to maintain
    maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
    serverSelectionTimeoutMS: 5000, // How long to try selecting a server
    socketTimeoutMS: 45000, // How long a send or receive on a socket can take before timeout
    connectTimeoutMS: 10000, // How long to wait for initial connection
  }

  // In development, use global to prevent multiple connections during hot reload
  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClient) {
      global._mongoClient = new MongoClient(databaseUrl, clientOptions)
      await global._mongoClient.connect()
      // Verify connection is established
      await global._mongoClient.db('admin').command({ ping: 1 })
      console.log('MongoDB connected (development)')
    } else {
      // Verify existing connection is still alive
      try {
        await global._mongoClient.db('admin').command({ ping: 1 })
      } catch (error) {
        // Connection lost, reconnect
        console.log('MongoDB connection lost, reconnecting...')
        await global._mongoClient.connect()
        await global._mongoClient.db('admin').command({ ping: 1 })
        console.log('MongoDB reconnected (development)')
      }
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
      client = new MongoClient(databaseUrl, clientOptions)
      await client.connect()
      // Verify connection is established
      await client.db('admin').command({ ping: 1 })
      console.log('MongoDB connected (production)')
    } else {
      // Verify existing connection is still alive
      try {
        await client.db('admin').command({ ping: 1 })
      } catch (error) {
        // Connection lost, reconnect
        console.log('MongoDB connection lost, reconnecting...')
        await client.connect()
        await client.db('admin').command({ ping: 1 })
        console.log('MongoDB reconnected (production)')
      }
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
    await clientsCollection.createIndex({ id: 1 }, { unique: true })
    await clientsCollection.createIndex({ user_id: 1 })
    await clientsCollection.createIndex({ name: 1 })
    await clientsCollection.createIndex({ email: 1 })

    const invoicesCollection = database.collection('invoices')
    await invoicesCollection.createIndex({ id: 1 }, { unique: true })
    await invoicesCollection.createIndex({ user_id: 1 })
    await invoicesCollection.createIndex({ client_id: 1 })
    await invoicesCollection.createIndex({ year: -1, month: -1 })
    await invoicesCollection.createIndex({ sent_to_client: 1 })
    await invoicesCollection.createIndex({ sent_to_accountant: 1 })
    await invoicesCollection.createIndex({ payment_received: 1 })

    const invoiceFilesCollection = database.collection('invoice_files')
    await invoiceFilesCollection.createIndex({ id: 1 }, { unique: true })
    await invoiceFilesCollection.createIndex({ user_id: 1 })
    await invoiceFilesCollection.createIndex({ invoice_id: 1 })
    await invoiceFilesCollection.createIndex({ file_key: 1 })

    const emailHistoryCollection = database.collection('email_history')
    await emailHistoryCollection.createIndex({ id: 1 }, { unique: true })
    await emailHistoryCollection.createIndex({ user_id: 1 })
    await emailHistoryCollection.createIndex({ invoice_id: 1 })
    await emailHistoryCollection.createIndex({ sent_at: -1 })

    const emailTemplatesCollection = database.collection('email_templates')
    await emailTemplatesCollection.createIndex({ id: 1 }, { unique: true })
    await emailTemplatesCollection.createIndex({ user_id: 1 })
    await emailTemplatesCollection.createIndex({ type: 1 })

    const settingsCollection = database.collection('settings')
    await settingsCollection.createIndex({ user_id: 1, key: 1 }, { unique: true })

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
