/**
 * Google Drive Files API Route
 * Handles file search and download operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchFiles, downloadFile, getFileMetadata } from '@/lib/server/google-drive'
import { requireAuth } from '@/lib/server/auth'
import { put } from '@vercel/blob'

/**
 * GET /api/google-drive/files
 * Search for PDF files in user's Google Drive
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id
    
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('query') || undefined
    
    const files = await searchFiles(userId, query)
    
    return NextResponse.json({
      success: true,
      files: files.map(file => ({
        id: file.id,
        name: file.name,
        size: file.size ? parseInt(file.size) : 0,
        modifiedTime: file.modifiedTime,
        parents: file.parents || [],
      })),
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    console.error('Error searching files:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to search files'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * POST /api/google-drive/files/download
 * Download a file from Google Drive and upload to Vercel Blob
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id
    const userEmail = session.user.email
    
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: true, message: 'BLOB_READ_WRITE_TOKEN not configured' },
        { status: 500 }
      )
    }
    
    const body = await request.json()
    const { fileId } = body
    
    if (!fileId) {
      return NextResponse.json(
        { error: true, message: 'File ID is required' },
        { status: 400 }
      )
    }
    
    // Get file metadata first
    const metadata = await getFileMetadata(userId, fileId)
    
    if (!metadata.name) {
      return NextResponse.json(
        { error: true, message: 'File not found' },
        { status: 404 }
      )
    }
    
    // Download file from Google Drive
    const fileBuffer = await downloadFile(userId, fileId)
    
    // Upload to Vercel Blob
    const sanitizedEmail = userEmail.replace(/[@.]/g, '_')
    const fileKey = `${sanitizedEmail}/${Date.now()}-${metadata.name}`
    
    await put(fileKey, fileBuffer, {
      access: 'public',
      contentType: 'application/pdf',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
    
    return NextResponse.json({
      success: true,
      fileKey,
      fileName: metadata.name,
      fileSize: fileBuffer.length,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    console.error('Error downloading file:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to download file'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

