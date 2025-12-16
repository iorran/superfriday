/**
 * Microsoft OAuth Initiation API Route
 * Handles OAuth initiation - redirects to Microsoft
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/server/microsoft-oauth'
import { getEmailAccount } from '@/lib/server/db-operations'
import { requireAuth } from '@/lib/server/auth'

/**
 * GET /api/email-accounts/oauth/auth
 * Initiate OAuth flow - redirect to Microsoft
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const searchParams = request.nextUrl.searchParams
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json(
        { error: true, message: 'accountId is required' },
        { status: 400 }
      )
    }

    // Get email account to retrieve Client ID/Secret
    const account = await getEmailAccount(accountId, userId)
    if (!account) {
      return NextResponse.json(
        { error: true, message: 'Email account not found' },
        { status: 404 }
      )
    }

    // Require OAuth credentials - each user must provide their own
    if (!account.oauth2_client_id || !account.oauth2_client_secret) {
      return NextResponse.json(
        { error: true, message: 'OAuth credentials not configured. Please provide Client ID and Client Secret in email account settings before connecting.' },
        { status: 400 }
      )
    }

    // Generate authorization URL with account's Client ID
    const authUrl = getAuthUrl(
      accountId,
      userId,
      account.oauth2_client_id
    )

    return NextResponse.redirect(authUrl)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Error initiating Microsoft OAuth:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to initiate OAuth'

    // Redirect to settings page with error
    const baseUrl = process.env.BETTER_AUTH_URL ||
                    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
                    `${request.nextUrl.protocol}//${request.nextUrl.host}`

    return NextResponse.redirect(
      `${baseUrl}/settings/email-accounts?error=${encodeURIComponent(errorMessage)}`
    )
  }
}
