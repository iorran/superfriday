/**
 * Google Drive Status API Route
 * Check if user has Google Drive connected
 */

import { NextRequest, NextResponse } from 'next/server'
import { hasGoogleOAuthToken } from '@/lib/server/db-operations'
import { requireAuth } from '@/lib/server/auth'

/**
 * GET /api/google-drive/status
 * Check if user has Google Drive connected
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id
    
    const isConnected = await hasGoogleOAuthToken(userId)
    
    return NextResponse.json({
      success: true,
      connected: isConnected,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    console.error('Error checking Google Drive status:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to check status'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/google-drive/status
 * Disconnect Google Drive (delete tokens)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function DELETE(_request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id
    
    const { deleteGoogleOAuthToken } = await import('@/lib/server/db-operations')
    await deleteGoogleOAuthToken(userId)
    
    return NextResponse.json({
      success: true,
      message: 'Google Drive disconnected',
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    console.error('Error disconnecting Google Drive:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to disconnect'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

