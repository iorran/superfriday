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
    
    console.log('OAuth callback received:', { 
      hasCode: !!code, 
      hasError: !!error, 
      state, 
      userId,
      stateMatch: state === userId 
    })
    
    if (error) {
      console.error('OAuth error from Google:', error)
      throw new Error(`OAuth error: ${error}`)
    }
    
    if (!code) {
      console.error('No authorization code provided')
      throw new Error('No authorization code provided')
    }
    
    // Verify state matches userId (security check)
    // State might be URL encoded, so decode it first
    const decodedState = state ? decodeURIComponent(state) : null
    if (decodedState !== userId && state !== userId) {
      console.error('State mismatch:', { state, decodedState, userId })
      throw new Error('Invalid state parameter')
    }
    
    console.log('Processing OAuth callback for user:', userId)
    await handleOAuthCallback(code, userId)
    console.log('OAuth callback processed successfully')
    
    // Redirect to import page with success
    // Use the request URL to determine the base URL if env vars are not set
    const baseUrl = process.env.BETTER_AUTH_URL || 
                    process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 
                    `${request.nextUrl.protocol}//${request.nextUrl.host}`
    
    const redirectUrl = `${baseUrl}/import-old-files?connected=google-drive`
    console.log('Redirecting to:', redirectUrl)
    return NextResponse.redirect(redirectUrl)
  } catch (error: unknown) {
    console.error('Error handling OAuth callback:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to connect Google Drive'
    
    // Redirect to import page with error
    // Use the request URL to determine the base URL if env vars are not set
    const baseUrl = process.env.BETTER_AUTH_URL || 
                    process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 
                    `${request.nextUrl.protocol}//${request.nextUrl.host}`
    
    return NextResponse.redirect(`${baseUrl}/import-old-files?error=${encodeURIComponent(errorMessage)}`)
  }
}

