/**
 * Invoice API Route
 * Handles individual invoice operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { getInvoice, deleteInvoice, updateInvoice } from '@/lib/db-client'
import { deleteFile } from '@/lib/storage'
import { executeQuery } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params

    if (!invoiceId) {
      return NextResponse.json(
        { error: true, message: 'invoiceId parameter is required' },
        { status: 400 }
      )
    }

    const invoice = await getInvoice(invoiceId)

    if (!invoice) {
      return NextResponse.json(
        { error: true, message: 'Invoice not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(invoice)
  } catch (error: unknown) {
    console.error('Error fetching invoice:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch invoice'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params
    const body = await request.json()

    if (!invoiceId) {
      return NextResponse.json(
        { error: true, message: 'invoiceId parameter is required' },
        { status: 400 }
      )
    }

    await updateInvoice(invoiceId, body)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error updating invoice:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to update invoice'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params

    if (!invoiceId) {
      return NextResponse.json(
        { error: true, message: 'invoiceId parameter is required' },
        { status: 400 }
      )
    }

    // Get all file keys before deleting from database
    const filesResult = executeQuery(
      'SELECT file_key FROM invoice_files WHERE invoice_id = ?',
      [invoiceId]
    )
    const files = (filesResult.results || []) as Array<{ file_key: string }>

    // Delete files from blob storage
    const deletePromises = files.map(async (file) => {
      try {
        await deleteFile(file.file_key)
      } catch (error: unknown) {
        // Log error but continue with deletion
        console.warn(`Failed to delete file ${file.file_key} from storage:`, error)
      }
    })

    // Wait for all file deletions to complete (or fail gracefully)
    await Promise.allSettled(deletePromises)

    // Delete from database (this will also delete invoice_files records)
    await deleteInvoice(invoiceId)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting invoice:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete invoice'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

