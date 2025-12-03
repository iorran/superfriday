/**
 * Email History API Route
 * Gets email history for an invoice
 */

import { NextRequest, NextResponse } from 'next/server'
import { getEmailHistory } from '@/lib/db-client'

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

    const history = await getEmailHistory(invoiceId)
    return NextResponse.json(history)
  } catch (error: unknown) {
    console.error('Error fetching email history:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch email history'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

