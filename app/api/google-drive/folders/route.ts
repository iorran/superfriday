/**
 * Google Drive Folders API Route
 * Handles folder listing operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { listFolders } from '@/lib/server/google-drive'
import { requireAuth } from '@/lib/server/auth'

/**
 * GET /api/google-drive/folders
 * List all folders in user's Google Drive
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id
    
    const folders = await listFolders(userId)
    
    return NextResponse.json({
      success: true,
      folders: folders.map(folder => ({
        id: folder.id,
        name: folder.name,
        parents: folder.parents || [],
      })),
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    console.error('Error listing folders:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to list folders'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

