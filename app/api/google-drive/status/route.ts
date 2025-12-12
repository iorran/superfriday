/**
 * Google Drive Status API Route
 * Check if user has Google Drive connected
 */

import { NextRequest, NextResponse } from 'next/server'
import { hasGoogleOAuthToken } from '@/lib/db-client'
import { requireAuth } from '@/lib/auth-server'

/**
 * GET /api/google-drive/status
 * Check if user has Google Drive connected
 */
export async function GET(request: NextRequest) {
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
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id
    
    const { deleteGoogleOAuthToken } = await import('@/lib/db-client')
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

