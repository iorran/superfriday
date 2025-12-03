/**
 * Invoice Files API Route
 * Handles adding and removing files from an invoice
 */

import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import { deleteFile } from '@/lib/storage'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
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
    const fileResult = executeQuery(
      'SELECT file_key FROM invoice_files WHERE id = ? AND invoice_id = ?',
      [fileId, invoiceId]
    )
    const file = fileResult.results?.[0] as { file_key: string } | undefined

    if (file && file.file_key) {
      // Delete from storage
      try {
        await deleteFile(file.file_key)
      } catch (error: unknown) {
        // Ignore storage errors, continue with DB deletion
        console.warn('Error deleting file from storage:', error)
      }
    }

    // Delete from database
    executeQuery('DELETE FROM invoice_files WHERE id = ? AND invoice_id = ?', [fileId, invoiceId])

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting invoice file:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete invoice file'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

