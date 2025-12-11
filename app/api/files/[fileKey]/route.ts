/**
 * File Download API Route
 * Serves files from Vercel Blob
 */

import { NextRequest, NextResponse } from 'next/server'
import { head } from '@vercel/blob'
import { requireAuth } from '@/lib/auth-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileKey: string }> }
) {
  try {
    // Require authentication
    const session = await requireAuth()
    const userEmail = session.user.email

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: true, message: 'BLOB_READ_WRITE_TOKEN not configured' },
        { status: 500 }
      )
    }

    const { fileKey } = await params

    if (!fileKey) {
      return NextResponse.json(
        { error: true, message: 'fileKey parameter is required' },
        { status: 400 }
      )
    }

    // Verify file belongs to user (check if fileKey starts with user's email folder)
    const sanitizedEmail = userEmail.replace(/[@.]/g, '_')
    if (!fileKey.startsWith(sanitizedEmail + '/')) {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get file metadata and URL using head
    const blob = await head(fileKey, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    if (!blob || !blob.url) {
      return NextResponse.json(
        { error: true, message: 'File not found' },
        { status: 404 }
      )
    }

    // Fetch the file from the public URL
    const response = await fetch(blob.url)
    if (!response.ok) {
      return NextResponse.json(
        { error: true, message: 'Failed to fetch file' },
        { status: response.status }
      )
    }

    // Convert to Buffer
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Try to detect content type from file extension
    const fileKeyStr = String(fileKey || '')
    const ext = fileKeyStr.split('.').pop()?.toLowerCase() || ''
    const contentTypes: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      txt: 'text/plain',
      csv: 'text/csv',
    }
    const contentType = contentTypes[ext || ''] || blob.contentType || 'application/octet-stream'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileKey}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error: unknown) {
    console.error('Error serving file:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    const errorObj = error as { status?: number; message?: string }
    
    if (errorObj.status === 404 || errorObj.message?.includes('not found')) {
      return NextResponse.json(
        { error: true, message: 'File not found' },
        { status: 404 }
      )
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to serve file'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}
