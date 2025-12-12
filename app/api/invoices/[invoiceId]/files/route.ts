/**
 * Invoice Files API Route
 * Handles adding and removing files from an invoice
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/server/db'
import { deleteFile } from '@/lib/server/storage'
import { requireAuth } from '@/lib/server/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const { invoiceId } = await params
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')

    if (!invoiceId || !fileId) {
      return NextResponse.json(
        { error: true, message: 'invoiceId and fileId are required' },
        { status: 400 }
      )
    }

    // Get file info before deleting
    const db = await getDatabase()
    const file = await db.collection('invoice_files').findOne({
      id: fileId,
      invoice_id: invoiceId,
      user_id: userId,
    })

    if (file && file.file_key) {
      // Delete from storage
      try {
        await deleteFile(file.file_key as string)
      } catch (error: unknown) {
        // Ignore storage errors, continue with DB deletion
        console.warn('Error deleting file from storage:', error)
      }
    }

    // Delete from database
    await db.collection('invoice_files').deleteOne({
      id: fileId,
      invoice_id: invoiceId,
      user_id: userId,
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error deleting invoice file:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete invoice file'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

