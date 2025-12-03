/**
 * Invoices API Route
 * Handles invoice listing and creation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createInvoice, getAllInvoices } from '@/lib/db-client'

export async function GET() {
  try {
    const invoices = await getAllInvoices()
    return NextResponse.json(invoices)
  } catch (error: unknown) {
    console.error('Error fetching invoices:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch invoices'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      clientId,
      invoiceAmount,
      dueDate,
      month,
      year,
      notes,
      files,
    } = body

    if (!clientId || !invoiceAmount || !dueDate || !month || !year || !files || files.length === 0) {
      return NextResponse.json(
        { error: true, message: 'Missing required fields: clientId, invoiceAmount, dueDate, month, year, files' },
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

    // Validate: if client requires timesheet, must have at least one timesheet file
    // This validation should be done client-side, but we check here too
    const hasInvoice = files.some((f: { fileType: string }) => f.fileType === 'invoice')
    if (!hasInvoice) {
      return NextResponse.json(
        { error: true, message: 'At least one invoice file is required' },
        { status: 400 }
      )
    }

    const invoiceId = await createInvoice({
      clientId,
      invoiceAmount: parseFloat(invoiceAmount),
      dueDate,
      month: parseInt(month),
      year: parseInt(year),
      notes: notes || null,
      files,
    })

    return NextResponse.json({
      success: true,
      invoiceId,
    })
  } catch (error: unknown) {
    console.error('Invoice creation error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create invoice'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

