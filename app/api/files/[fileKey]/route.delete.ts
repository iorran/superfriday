/**
 * File Delete API Route
 */

import { NextRequest, NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import { deleteInvoice } from '@/lib/db-client'

export async function DELETE(
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

    // Delete from Vercel Blob
    try {
      await del(fileKey, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      })
    } catch (error: any) {
      // Ignore if file doesn't exist in blob storage
      if (error.status !== 404 && !error.message?.includes('not found')) {
        throw error
      }
    }

    // Delete from database
    await deleteInvoice(fileKey)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting file:', error)
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to delete file' },
      { status: 500 }
    )
  }
}
