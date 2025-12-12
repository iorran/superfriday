/**
 * Import Old Invoices API Route
 * Creates invoices that are marked as already sent to client
 */

import { NextRequest, NextResponse } from 'next/server'
import { createInvoice } from '@/lib/db-client'
import { requireAuth } from '@/lib/auth-server'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const body = await request.json()
    const {
      clientId,
      clientName, // Optional: name for client if it needs to be created
      invoiceAmount,
      month,
      year,
      files,
    } = body

    if (!clientId || !invoiceAmount || !month || !year || !files || files.length === 0) {
      return NextResponse.json(
        { error: true, message: 'Missing required fields: clientId, invoiceAmount, month, year, files' },
        { status: 400 }
      )
    }

    // Validate files structure
    for (const file of files) {
      if (!file.fileKey || !file.fileType || !file.originalName || !file.fileSize) {
        return NextResponse.json(
          { error: true, message: 'Each file must have fileKey, fileType, originalName, and fileSize' },
          { status: 400 }
        )
      }
      if (file.fileType !== 'invoice' && file.fileType !== 'timesheet') {
        return NextResponse.json(
          { error: true, message: 'fileType must be "invoice" or "timesheet"' },
          { status: 400 }
        )
      }
    }

    // Validate: must have at least one invoice file
    const hasInvoice = files.some((f: { fileType: string }) => f.fileType === 'invoice')
    if (!hasInvoice) {
      return NextResponse.json(
        { error: true, message: 'At least one invoice file is required' },
        { status: 400 }
      )
    }

    // Create invoice with isOldImport flag set to true
    const invoiceId = await createInvoice({
      clientId,
      clientName: clientName || undefined,
      invoiceAmount: parseFloat(invoiceAmount),
      month: parseInt(month),
      year: parseInt(year),
      files,
      isOldImport: true, // Mark as old import - already sent to client
    }, userId)

    return NextResponse.json({
      success: true,
      invoiceId,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Old invoice import error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to import old invoice'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

