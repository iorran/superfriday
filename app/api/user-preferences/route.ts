/**
 * User Preferences API Route
 * Handles user preferences operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserPreferences, updateUserPreferences, getUserPreference, setUserPreference } from '@/lib/server/db-operations'
import { requireAuth } from '@/lib/server/auth'

/**
 * GET /api/user-preferences
 * Get all user preferences or a specific preference
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id
    
    const searchParams = request.nextUrl.searchParams
    const key = searchParams.get('key')
    
    if (key) {
      // Get specific preference
      const value = await getUserPreference(userId, key)
      return NextResponse.json({
        success: true,
        key,
        value,
      })
    } else {
      // Get all preferences
      const preferences = await getUserPreferences(userId)
      return NextResponse.json({
        success: true,
        preferences: preferences || {},
      })
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    console.error('Error fetching user preferences:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch preferences'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * POST /api/user-preferences
 * Update user preferences
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id
    
    const body = await request.json()
    const { key, value, preferences } = body
    
    if (key !== undefined && value !== undefined) {
      // Set a specific preference
      await setUserPreference(userId, key, value)
      return NextResponse.json({
        success: true,
        message: 'Preference updated',
      })
    } else if (preferences) {
      // Update multiple preferences
      await updateUserPreferences(userId, preferences)
      return NextResponse.json({
        success: true,
        message: 'Preferences updated',
      })
    } else {
      return NextResponse.json(
        { error: true, message: 'Either key/value or preferences object is required' },
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
    
    console.error('Error updating user preferences:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to update preferences'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

