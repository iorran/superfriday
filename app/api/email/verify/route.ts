/**
 * Email Verification API Route
 * Verifies SMTP connection
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifySMTPConnection } from '@/lib/server/email'
import { requireAuth } from '@/lib/server/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    
    // If accountId provided, require auth to get userId
    let userId: string | undefined
    if (accountId) {
      const session = await requireAuth()
      userId = session.user.id
    }
    
    const result = await verifySMTPConnection(accountId || undefined, userId)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'SMTP connection verified successfully',
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'SMTP connection failed',
          error: result.error,
        },
        { status: 400 }
      )
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        success: false,
        message: 'SMTP verification error',
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}

