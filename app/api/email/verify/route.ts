/**
 * Email Verification API Route
 * Verifies SMTP connection
 */

import { NextResponse } from 'next/server'
import { verifySMTPConnection } from '@/lib/email-service'

export async function GET() {
  try {
    const result = await verifySMTPConnection()
    
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
        { status: 500 }
      )
    }
  } catch (error: unknown) {
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

