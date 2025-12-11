/**
 * Better Auth Configuration
 * Handles authentication with email and password
 */

import { betterAuth } from 'better-auth'
import { mongodbAdapter } from 'better-auth/adapters/mongodb'
import { MongoClient, Db } from 'mongodb'

// Get database URL from environment variable
const databaseUrl = process.env.MONGODB_URI || process.env.DATABASE_URL

if (!databaseUrl) {
  console.warn('Warning: MONGODB_URI or DATABASE_URL environment variable is not set')
}

// Create a dedicated MongoDB connection for Better Auth
// We need to initialize it synchronously, so we'll use a lazy initialization pattern
let authDbInstance: Db | null = null

// Initialize the database connection
// This will be called when the adapter first needs the db
function getAuthDb(): Db {
  if (!databaseUrl) {
    throw new Error('MONGODB_URI or DATABASE_URL environment variable is required')
  }

  if (!authDbInstance) {
    // Create client and connect synchronously (connection happens in background)
    const client = new MongoClient(databaseUrl, {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    })
    
    // Get db instance (connection will be established when first used)
    const dbName = databaseUrl.split('/').pop()?.split('?')[0] || 'superfriday'
    authDbInstance = client.db(dbName)
    
    // Connect in background (non-blocking)
    client.connect().catch(err => {
      console.error('Better Auth MongoDB connection error:', err)
    })
  }

  return authDbInstance
}

export const auth = betterAuth({
  database: mongodbAdapter(getAuthDb()),
  emailAndPassword: {
    enabled: true,
  },
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000',
  basePath: '/api/auth',
  secret: process.env.BETTER_AUTH_SECRET || 'change-this-secret-in-production',
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
