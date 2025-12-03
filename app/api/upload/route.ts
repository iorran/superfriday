/**
 * File Upload API Route
 * Handles file uploads to Vercel Blob
 * Returns file key for use in invoice creation
 */

import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export async function POST(request: NextRequest) {
  try {
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

    const fileKey = `${Date.now()}-${file.name}`
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
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: true, message: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
