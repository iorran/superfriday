/**
 * Google Drive Folder Files API Route
 * Lists PDF files in a specific folder
 */

import { NextRequest, NextResponse } from 'next/server'
import { listFilesInFolder } from '@/lib/server/google-drive'
import { requireAuth } from '@/lib/server/auth'

/**
 * GET /api/google-drive/folders/[folderId]/files
 * List PDF files in a specific folder
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const session = await requireAuth()
    const userId = session.user.id
    
    const { folderId } = await params
    
    if (!folderId) {
      return NextResponse.json(
        { error: true, message: 'Folder ID is required' },
        { status: 400 }
      )
    }
    
    const files = await listFilesInFolder(userId, folderId)
    
    return NextResponse.json({
      success: true,
      files: files.map(file => ({
        id: file.id,
        name: file.name,
        size: file.size ? parseInt(file.size) : 0,
        modifiedTime: file.modifiedTime,
      })),
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    console.error('Error listing folder files:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to list folder files'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

