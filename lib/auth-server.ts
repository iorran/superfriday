/**
 * Better Auth Server Utilities
 * Server-side authentication helpers
 */

import { auth } from './auth'
import { headers } from 'next/headers'

/**
 * Get the current session on the server
 */
export async function getSession() {
  const headersList = await headers()
  const cookieHeader = headersList.get('cookie') || ''
  
  return await auth.api.getSession({
    headers: {
      cookie: cookieHeader,
    },
  })
}

/**
 * Get the current user on the server
 */
export async function getCurrentUser() {
  const session = await getSession()
  return session?.user || null
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth() {
  const session = await getSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }
  return session
}
