/**
 * Invoice State API Route
 * Handles invoice state updates
 */

import { NextRequest, NextResponse } from 'next/server'
import { updateInvoiceState } from '@/lib/db-client'

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

    await updateInvoiceState(invoiceId, body)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error updating invoice state:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to update invoice state'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

