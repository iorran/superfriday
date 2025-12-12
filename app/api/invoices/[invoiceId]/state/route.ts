/**
 * Invoice State API Route
 * Handles invoice state updates
 */

import { NextRequest, NextResponse } from 'next/server'
import { updateInvoiceState } from '@/lib/server/db-operations'
import { requireAuth } from '@/lib/server/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const { invoiceId } = await params
    const body = await request.json()

    if (!invoiceId) {
      return NextResponse.json(
        { error: true, message: 'invoiceId parameter is required' },
        { status: 400 }
      )
    }

    await updateInvoiceState(invoiceId, body, userId)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error updating invoice state:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to update invoice state'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

