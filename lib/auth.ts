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
  throw new Error('MONGODB_URI or DATABASE_URL environment variable is required')
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

const baseURL = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL
if (!baseURL || baseURL.trim() === '') {
  throw new Error('BETTER_AUTH_URL or NEXT_PUBLIC_BETTER_AUTH_URL environment variable is required and cannot be empty')
}

// Validate that baseURL is a valid absolute URL
try {
  new URL(baseURL)
} catch {
  throw new Error(`BETTER_AUTH_URL or NEXT_PUBLIC_BETTER_AUTH_URL must be a valid absolute URL (e.g., https://yourdomain.com). Got: ${baseURL}`)
}

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error('BETTER_AUTH_SECRET environment variable is required')
}

export const auth = betterAuth({
  database: mongodbAdapter(getAuthDb()),
  emailAndPassword: {
    enabled: true,
  },
  baseURL,
  basePath: '/api/auth',
  secret: process.env.BETTER_AUTH_SECRET,
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
