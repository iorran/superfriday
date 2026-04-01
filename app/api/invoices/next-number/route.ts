import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/server/auth'
import { getNextInvoiceNumber } from '@/lib/server/db-operations'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const clientId = request.nextUrl.searchParams.get('clientId')
    if (!clientId) {
      return NextResponse.json(
        { error: true, message: 'clientId is required' },
        { status: 400 }
      )
    }

    const nextNumber = await getNextInvoiceNumber(userId, clientId)

    return NextResponse.json({ success: true, nextNumber })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Error fetching next invoice number:', error)
    return NextResponse.json(
      { error: true, message: 'Failed to fetch next invoice number' },
      { status: 500 }
    )
  }
}
