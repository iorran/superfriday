/**
 * File Delete API Route
 */

import { NextRequest, NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import { getDatabase } from '@/lib/server/db'
import { requireAuth } from '@/lib/server/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileKey: string }> }
) {
  try {
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

    // Delete from Vercel Blob
    try {
      await del(fileKey, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      })
    } catch (error: unknown) {
      // Ignore if file doesn't exist in blob storage
      const errorObj = error as { status?: number; message?: string }
      if (errorObj.status !== 404 && !errorObj.message?.includes('not found')) {
        throw error
      }
    }

    // Delete from database (remove file reference from invoice_files)
    const db = await getDatabase()
    await db.collection('invoice_files').deleteMany({ file_key: fileKey })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error deleting file:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete file'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}
