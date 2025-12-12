/**
 * Google Drive OAuth Callback Route
 * Handles OAuth callback from Google
 */

import { NextRequest, NextResponse } from 'next/server'
import { handleOAuthCallback } from '@/lib/google-drive'
import { requireAuth } from '@/lib/auth-server'

/**
 * GET /api/google-drive/auth/callback
 * Handle OAuth callback from Google
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id
    
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const state = searchParams.get('state')
    
    if (error) {
      throw new Error(`OAuth error: ${error}`)
    }
    
    if (!code) {
      throw new Error('No authorization code provided')
    }
    
    // Verify state matches userId (security check)
    if (state !== userId) {
      throw new Error('Invalid state parameter')
    }
    
    await handleOAuthCallback(code, userId)
    
    // Redirect to import page with success
    const baseUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL || ''
    return NextResponse.redirect(`${baseUrl}/import-old-files?connected=google-drive`)
  } catch (error: unknown) {
    console.error('Error handling OAuth callback:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to connect Google Drive'
    
    // Redirect to import page with error
    const baseUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL || ''
    return NextResponse.redirect(`${baseUrl}/import-old-files?error=${encodeURIComponent(errorMessage)}`)
  }
}

