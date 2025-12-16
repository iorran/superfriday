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
export const getDatabase = async (): Promise<Db> => {
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
      } catch {
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
      } catch {
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




