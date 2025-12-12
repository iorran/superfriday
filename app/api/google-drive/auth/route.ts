/**
 * Google Drive OAuth API Route
 * Handles OAuth initiation - redirects to Google
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/google-drive'
import { requireAuth } from '@/lib/auth-server'

/**
 * GET /api/google-drive/auth
 * Initiate OAuth flow - redirect to Google
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id
    
    const searchParams = request.nextUrl.searchParams
    const state = searchParams.get('state') || userId // Use userId as state for security
    
    const authUrl = getAuthUrl(state)
    
    return NextResponse.redirect(authUrl)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    console.error('Error initiating Google OAuth:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to initiate OAuth'
    
    // Redirect to import page with error
    // Use the request URL to determine the base URL if env vars are not set
    const baseUrl = process.env.BETTER_AUTH_URL || 
                    process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 
                    `${request.nextUrl.protocol}//${request.nextUrl.host}`
    
    return NextResponse.redirect(`${baseUrl}/import-old-files?error=${encodeURIComponent(errorMessage)}`)
  }
}

