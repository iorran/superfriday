/**
 * Invoice API Route
 * Handles individual invoice operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { getInvoice, deleteInvoice, updateInvoice } from '@/lib/db-client'

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

