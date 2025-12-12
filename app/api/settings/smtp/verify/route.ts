/**
 * SMTP Verification API Route
 * Verifies SMTP connection with current settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifySMTPConnection } from '@/lib/email-service'
import { requireAuth } from '@/lib/auth-server'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const result = await verifySMTPConnection(userId)
    return NextResponse.json(result)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error verifying SMTP connection:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to verify SMTP connection'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}


