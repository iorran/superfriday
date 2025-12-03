/**
 * Settings API Route
 * Handles global settings like accountant email
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSetting, setSetting, getAccountantEmail, setAccountantEmail } from '@/lib/db-client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (key === 'accountant_email') {
      const email = await getAccountantEmail()
      return NextResponse.json({ value: email })
    }

    if (key) {
      const value = await getSetting(key)
      return NextResponse.json({ value })
    }

    // Return all settings
    return NextResponse.json({ error: true, message: 'key parameter is required' }, { status: 400 })
  } catch (error: unknown) {
    console.error('Error getting setting:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to get setting'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, value } = body

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: true, message: 'key and value are required' },
        { status: 400 }
      )
    }

    if (key === 'accountant_email') {
      await setAccountantEmail(value)
      return NextResponse.json({ success: true })
    }

    await setSetting(key, value)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error setting setting:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to set setting'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

