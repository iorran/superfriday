/**
 * SMTP Settings API Route
 * Handles SMTP configuration settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSMTPSettings, setSMTPSettings } from '@/lib/db-client'
import { requireAuth } from '@/lib/auth-server'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const settings = await getSMTPSettings(userId)
    return NextResponse.json(settings)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error getting SMTP settings:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to get SMTP settings'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const body = await request.json()
    const { host, port, user, pass, from } = body

    await setSMTPSettings(
      {
        host,
        port,
        user,
        pass,
        from,
      },
      userId
    )

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error setting SMTP settings:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to set SMTP settings'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}


