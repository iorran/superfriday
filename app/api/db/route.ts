/**
 * Database API Route
 * Handles database queries via HTTP
 */

import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { sql, params = [] } = await request.json()

    if (!sql) {
      return NextResponse.json(
        { error: true, message: 'SQL query is required' },
        { status: 400 }
      )
    }

    const result = executeQuery(sql, params)

    return NextResponse.json(result, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error: unknown) {
    console.error('Database query error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Database query failed'
    return NextResponse.json(
      {
        error: true,
        message: errorMessage,
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}

