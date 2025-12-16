/**
 * Better Auth Client
 * Client-side authentication utilities
 */

import { createAuthClient } from 'better-auth/react'

const baseURL = process.env.NEXT_PUBLIC_BETTER_AUTH_URL

if (!baseURL || baseURL.trim() === '') {
  throw new Error('NEXT_PUBLIC_BETTER_AUTH_URL environment variable is required and cannot be empty')
}

// Validate that baseURL is a valid absolute URL
try {
  new URL(baseURL)
} catch {
  throw new Error(`NEXT_PUBLIC_BETTER_AUTH_URL must be a valid absolute URL (e.g., https://yourdomain.com). Got: ${baseURL}`)
}

export const authClient = createAuthClient({
  baseURL,
  basePath: '/api/auth',
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient



