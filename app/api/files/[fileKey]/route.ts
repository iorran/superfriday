/**
 * File Download API Route
 * Serves files from Vercel Blob
 */

import { NextRequest, NextResponse } from 'next/server'
import { head } from '@vercel/blob'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileKey: string }> }
) {
  try {
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
    const ext = fileKey.split('.').pop()?.toLowerCase()
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
  } catch (error: any) {
    console.error('Error serving file:', error)
    
    if (error.status === 404 || error.message?.includes('not found')) {
      return NextResponse.json(
        { error: true, message: 'File not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: true, message: error.message || 'Failed to serve file' },
      { status: 500 }
    )
  }
}
