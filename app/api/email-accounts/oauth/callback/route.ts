/**
 * Microsoft OAuth Callback Route
 * Handles OAuth callback from Microsoft
 */

import { NextRequest, NextResponse } from 'next/server'
import { handleOAuthCallback } from '@/lib/server/microsoft-oauth'
import { requireAuth } from '@/lib/server/auth'

/**
 * GET /api/email-accounts/oauth/callback
 * Handle OAuth callback from Microsoft
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const state = searchParams.get('state')
    const errorDescription = searchParams.get('error_description')

    console.log('Microsoft OAuth callback received:', {
      hasCode: !!code,
      hasError: !!error,
      state,
      userId,
    })

    if (error) {
      console.error('OAuth error from Microsoft:', error, errorDescription)
      const errorMessage = errorDescription || error || 'OAuth error occurred'
      throw new Error(`OAuth error: ${errorMessage}`)
    }

    if (!code) {
      console.error('No authorization code provided')
      throw new Error('No authorization code provided')
    }

    if (!state) {
      console.error('No state parameter provided')
      throw new Error('No state parameter provided')
    }

    // Parse state (should contain accountId and userId)
    let stateData: { accountId: string; userId: string }
    try {
      stateData = JSON.parse(decodeURIComponent(state))
    } catch {
      console.error('Invalid state format:', state)
      throw new Error('Invalid state parameter')
    }

    // Verify state matches userId (security check)
    if (stateData.userId !== userId) {
      console.error('State mismatch:', { stateUserId: stateData.userId, userId })
      throw new Error('Invalid state parameter - user mismatch')
    }

    if (!stateData.accountId) {
      console.error('No accountId in state')
      throw new Error('Invalid state parameter - missing accountId')
    }

    console.log('Processing OAuth callback for account:', stateData.accountId, 'user:', userId)
    await handleOAuthCallback(code, stateData.accountId, userId)
    console.log('OAuth callback processed successfully')

    // Redirect to settings page with success
    const baseUrl = process.env.BETTER_AUTH_URL ||
                    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
                    `${request.nextUrl.protocol}//${request.nextUrl.host}`

    const redirectUrl = `${baseUrl}/settings/email-accounts?connected=microsoft`
    console.log('Redirecting to:', redirectUrl)
    return NextResponse.redirect(redirectUrl)
  } catch (error: unknown) {
    console.error('Error handling Microsoft OAuth callback:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to connect Microsoft account'

    // Redirect to settings page with error
    const baseUrl = process.env.BETTER_AUTH_URL ||
                    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
                    `${request.nextUrl.protocol}//${request.nextUrl.host}`

    return NextResponse.redirect(
      `${baseUrl}/settings/email-accounts?error=${encodeURIComponent(errorMessage)}`
    )
  }
}
