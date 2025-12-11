/**
 * File Upload API Route
 * Handles file uploads to Vercel Blob
 * Returns file key for use in invoice creation
 */

import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { requireAuth } from '@/lib/auth-server'

export async function POST(request: NextRequest) {
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

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: true, message: 'File is required' },
        { status: 400 }
      )
    }

    // Validate file size
    if (!process.env.MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: true, message: 'MAX_FILE_SIZE environment variable is required' },
        { status: 500 }
      )
    }
    const maxFileSize = parseInt(process.env.MAX_FILE_SIZE, 10)
    if (file.size > maxFileSize) {
      const maxSizeMB = (maxFileSize / 1024 / 1024).toFixed(1)
      return NextResponse.json(
        { 
          error: true, 
          message: `File size exceeds maximum allowed size of ${maxSizeMB}MB` 
        },
        { status: 400 }
      )
    }

    // Sanitize email for folder name (replace @ and . with safe characters)
    const sanitizedEmail = userEmail.replace(/[@.]/g, '_')
    const fileKey = `${sanitizedEmail}/${Date.now()}-${file.name}`
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    // Upload file to Vercel Blob
    const blob = await put(fileKey, fileBuffer, {
      access: 'public',
      contentType: file.type,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    return NextResponse.json({
      success: true,
      fileKey,
      fileName: file.name,
      fileSize: file.size,
      url: blob.url,
    })
  } catch (error: unknown) {
    console.error('Upload error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    const errorMessage = error instanceof Error ? error.message : 'Upload failed'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}
