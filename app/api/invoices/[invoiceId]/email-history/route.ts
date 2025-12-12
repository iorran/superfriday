/**
 * Email History API Route
 * Gets email history for an invoice
 */

import { NextRequest, NextResponse } from 'next/server'
import { getEmailHistory } from '@/lib/server/db-operations'
import { requireAuth } from '@/lib/server/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const { invoiceId } = await params

    if (!invoiceId) {
      return NextResponse.json(
        { error: true, message: 'invoiceId parameter is required' },
        { status: 400 }
      )
    }

    const history = await getEmailHistory(invoiceId, userId)
    return NextResponse.json(history)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error fetching email history:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch email history'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

