/**
 * Google Drive File Download API Route
 * Downloads a file from Google Drive and uploads to Vercel Blob
 */

import { NextRequest, NextResponse } from 'next/server'
import { downloadFile, getFileMetadata } from '@/lib/server/google-drive'
import { requireAuth } from '@/lib/server/auth'
import { put } from '@vercel/blob'

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
    
    const body = await request.json().catch(() => ({}))
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
    
    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json(
        { error: true, message: 'Failed to download file from Google Drive' },
        { status: 500 }
      )
    }
    
    // Upload to Vercel Blob
    const sanitizedEmail = userEmail.replace(/[@.]/g, '_')
    const fileKey = `${sanitizedEmail}/${Date.now()}-${metadata.name}`
    
    console.log('Uploading file to blob:', {
      fileKey,
      fileSize: fileBuffer.length,
      fileName: metadata.name,
    })
    
    try {
      const blobResult = await put(fileKey, fileBuffer, {
        access: 'public',
        contentType: 'application/pdf',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      })
      
      console.log('File uploaded successfully:', {
        fileKey,
        url: blobResult.url,
      })
      
      return NextResponse.json({
        success: true,
        fileKey,
        fileName: metadata.name,
        fileSize: fileBuffer.length,
        url: blobResult.url, // Return the direct blob URL
      })
    } catch (uploadError) {
      console.error('Error uploading to blob:', uploadError)
      throw new Error(`Failed to upload file to storage: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`)
    }
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

